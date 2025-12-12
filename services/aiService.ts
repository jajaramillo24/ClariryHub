import { Idea, NFR, ProjectCard, Attachment } from "../types";
import { processDocumentAttachment, isWordDocument, isExcelDocument } from "./documentProcessor";

const API_URL = "https://chat.jazusoft.com/api/chat/completions";
const API_KEY = import.meta.env.VITE_API_KEY || "";
const MODEL = "clarirtyhub";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface ChatCompletionRequest {
  stream: boolean;
  model: string;
  messages: ChatMessage[];
  features: {
    image_generation: boolean;
    code_interpreter: boolean;
    web_search: boolean;
  };
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
}

const callBedrockAPI = async (messages: ChatMessage[], jsonMode = false): Promise<string> => {
  const requestBody: ChatCompletionRequest = {
    stream: false,
    model: MODEL,
    messages,
    features: {
      image_generation: false,
      code_interpreter: false,
      web_search: false
    },
    temperature: 0.2,
    max_tokens: 4096,
  };

  if (jsonMode) {
    requestBody.response_format = { type: "json_object" };
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
};

const callBedrockAPIStream = async (
  messages: ChatMessage[], 
  onChunk: (chunk: string) => void,
  jsonMode = false
): Promise<string> => {
  const requestBody: ChatCompletionRequest = {
    stream: true,
    model: MODEL,
    messages,
    features: {
      image_generation: false,
      code_interpreter: false,
      web_search: false
    },
    temperature: 0.2,
    max_tokens: 4096,
  };

  if (jsonMode) {
    requestBody.response_format = { type: "json_object" };
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }

  const decoder = new TextDecoder();
  let fullContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            
            if (content) {
              fullContent += content;
              onChunk(content);
            }
          } catch (e) {
            // Skip malformed JSON
            continue;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullContent;
};

const cleanJsonResponse = (text: string): string => {
  let cleaned = text.trim();
  
  if (cleaned.startsWith('```json\n')) {
    cleaned = cleaned.slice(8);
  } else if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```\n')) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  
  if (cleaned.endsWith('\n```')) {
    cleaned = cleaned.slice(0, -4);
  } else if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  
  return cleaned.trim();
};

const CARD_SCHEMA_DESCRIPTION = `
Return a JSON object with this exact structure:
{
  "description": "Professional technical description of the task (string)",
  "acceptanceCriteria": ["criterion 1", "criterion 2", ...] (array of strings),
  "subtasks": [
    {
      "title": "task title (string)",
      "type": "Backend|Frontend|Testing|DevOps|Docs (string)",
      "storyPoints": 1|2|3|5|8|13 (Fibonacci number)
    }
  ],
  "totalStoryPoints": sum of all subtask story points (number),
  "justification": "Technical justification for the estimate (string)",
  "labels": ["label1", "label2", ...] (array of strings),
  "risks": ["risk1", "risk2", ...] (array of strings)
}
`;

// --- API Functions ---

export interface GenerationOptions {
  includeBackend: boolean;
  includeFrontend: boolean;
  includeTesting: boolean;
  includeDocs: boolean;
  detailedEstimation: boolean;
}

export const generateSmartCard = async (
  title: string,
  contextIdeas: Idea[],
  contextNfrs: NFR[],
  options: GenerationOptions,
  onChunk?: (chunk: string) => void
): Promise<Partial<ProjectCard>> => {
  const ideasText = contextIdeas.map(i => `- ${i.content}`).join('\n');
  const nfrsText = contextNfrs.map(n => `- [${n.category} - ${n.impactLevel} Priority] ${n.title}: ${n.description}`).join('\n');

  const scopeInstructions = `
    SCOPE OF WORK:
    - Backend Development: ${options.includeBackend ? 'REQUIRED' : 'EXCLUDED (Do not generate backend tasks)'}
    - Frontend Development: ${options.includeFrontend ? 'REQUIRED' : 'EXCLUDED (Do not generate frontend tasks)'}
    - Testing/QA: ${options.includeTesting ? 'REQUIRED' : 'EXCLUDED (Do not generate testing tasks)'}
    - Documentation: ${options.includeDocs ? 'REQUIRED' : 'EXCLUDED (Do not generate doc tasks)'}
  `;

  const estimationMode = options.detailedEstimation ? `
    ESTIMATION MODE: DETAILED (Full Production-Ready)
    - Include all edge cases, error handling, and comprehensive testing
    - Consider security, performance optimization, and full documentation
    - Include code review time, integration testing, and deployment preparation
    - Add monitoring, logging, and observability tasks
    - Plan for technical debt prevention and refactoring needs
  ` : `
    ESTIMATION MODE: MVP RÁPIDO (Minimum Viable to Ship)
    - Focus on core functionality only, minimal viable implementation
    - Basic validation and happy path testing only
    - Minimal documentation (just enough to understand)
    - Skip advanced optimizations, use simple approaches
    - Reduce subtasks to essential ones only
    - Aim for "working and shippable" not "perfect"
    - Estimates should be 30-50% lower than detailed mode
  `;

  const prompt = `
    You are a Senior Technical Product Manager.
    Create a detailed technical specification for a Jira issue titled: "${title}".
    
    ${scopeInstructions}
    
    ${estimationMode}

    ESTIMATION RULES (CONSERVATIVE):
    - Use Fibonacci sequence (1, 2, 3, 5, 8, 13).
    - Be strict and conservative. Do not inflate estimates.
    - 1 SP: Trivial text change, config change, or very simple function.
    - 2 SP: Simple CRUD operation or UI component without complex logic.
    - 3 SP: Standard feature with moderate logic.
    - 5 SP: Complex feature involving multiple components or tricky integration.
    - 8 SP: Very complex module (consider breaking down if possible).
    
    Context:
    ${ideasText}
    
    Technical Constraints:
    ${nfrsText}
    
    ${CARD_SCHEMA_DESCRIPTION}
    
    CRITICAL: Output ONLY the raw JSON object. Do NOT wrap it in markdown code blocks or backticks. 
    Do NOT include \`\`\`json or \`\`\` markers. Start directly with { and end with }.
    Use professional, corporate technical language. Do not use emojis.
  `;

  try {
    const messages: ChatMessage[] = [
      {
        role: "user",
        content: prompt,
      },
    ];

    let responseText: string;
    if (onChunk) {
      responseText = await callBedrockAPIStream(messages, onChunk, true);
    } else {
      responseText = await callBedrockAPI(messages, true);
    }
    
    if (!responseText) throw new Error("No response from AI");
    
    // Clean the response to remove markdown code blocks
    const cleanedResponse = cleanJsonResponse(responseText);
    
    try {
      return JSON.parse(cleanedResponse) as Partial<ProjectCard>;
    } catch (parseError) {
      console.error("JSON Parse Error. Raw response:", responseText);
      console.error("Cleaned response:", cleanedResponse);
      console.error("Parse error:", parseError);
      throw new Error(`Failed to parse JSON response: ${parseError}`);
    }
  } catch (error) {
    console.error("Error generating card:", error);
    throw error;
  }
};

export const analyzeRisks = async (nfrs: NFR[], onChunk?: (chunk: string) => void): Promise<string> => {
    const nfrsText = nfrs.map(n => `- [${n.category} - ${n.impactLevel} Priority] ${n.title}: ${n.description}`).join('\n');
    
    const prompt = `Analyze these Non-Functional Requirements. Return a strictly professional Markdown report identifying conflicts and technical risks. Do not use emojis. Use standard bullet points.\n\n${nfrsText}`;

    const messages: ChatMessage[] = [
      {
        role: "user",
        content: prompt,
      },
    ];

    if (onChunk) {
      return await callBedrockAPIStream(messages, onChunk);
    } else {
      const responseText = await callBedrockAPI(messages);
      return responseText || "No risks identified.";
    }
}

export const summarizeIdeas = async (
  ideas: Idea[], 
  attachments: Attachment[], 
  onChunk?: (chunk: string) => void
): Promise<string> => {
    const ideasText = ideas.map(i => `- ${i.content}`).join('\n');
    
    let prompt = `
        You are a Product Engineering Architect.
        Analyze the provided context, which includes brainstormed text notes.
        
        Group these concepts into professional Epics or Modules.
        Identify functional requirements and potential technical challenges.
        
        Return a clean Markdown report. Do not use emojis.
        
        Brainstormed Notes:
        ${ideasText}
    `;

    // If there are attachments, include information about them
    if (attachments.length > 0) {
      prompt += `\n\nAttached Files (${attachments.length}):\n`;
      
      // Process Word and Excel documents
      for (const file of attachments) {
        if (isWordDocument(file.mimeType, file.name) || isExcelDocument(file.mimeType, file.name)) {
          try {
            const extractedText = await processDocumentAttachment(file);
            if (extractedText) {
              prompt += `\n--- Content from ${file.name} ---\n${extractedText}\n`;
            }
          } catch (error) {
            console.error(`Failed to process ${file.name}:`, error);
            prompt += `- ${file.name} (${file.mimeType}) - Could not extract text\n`;
          }
        } else {
          prompt += `- ${file.name} (${file.mimeType})\n`;
        }
      }
      
      // For images, we can include them in the content
      const imageAttachments = attachments.filter(a => a.mimeType.startsWith('image/'));
      
      if (imageAttachments.length > 0) {
        const messages: ChatMessage[] = [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...imageAttachments.map(img => ({
                type: "image_url",
                image_url: { url: `data:${img.mimeType};base64,${img.base64}` }
              }))
            ]
          }
        ];
        
        try {
          if (onChunk) {
            return await callBedrockAPIStream(messages, onChunk);
          } else {
            const responseText = await callBedrockAPI(messages);
            return responseText || "No summary available.";
          }
        } catch (e) {
          console.error("Bedrock API Error:", e);
          return "Error analyzing files. Please try again.";
        }
      }
    }

    // For text-only or non-image attachments
    try {
      const messages: ChatMessage[] = [
        {
          role: "user",
          content: prompt,
        }
      ];
      
      if (onChunk) {
        return await callBedrockAPIStream(messages, onChunk);
      } else {
        const responseText = await callBedrockAPI(messages);
        return responseText || "No summary available.";
      }
    } catch (e) {
      console.error("Bedrock API Error:", e);
      return "Error analyzing content. Please try again.";
    }
}