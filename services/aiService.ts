import { Idea, NFR, ProjectCard, Attachment } from "../types";

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

// --- Schema Documentation (for prompt instructions) ---
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
}

export const generateSmartCard = async (
  title: string,
  contextIdeas: Idea[],
  contextNfrs: NFR[],
  options: GenerationOptions
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

  const prompt = `
    You are a Senior Technical Product Manager.
    Create a detailed technical specification for a Jira issue titled: "${title}".
    
    ${scopeInstructions}

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
    
    Output strictly structured JSON. Use professional, corporate technical language. Do not use emojis.
  `;

  try {
    const messages: ChatMessage[] = [
      {
        role: "user",
        content: prompt,
      },
    ];

    const responseText = await callBedrockAPI(messages, true);
    if (!responseText) throw new Error("No response from AI");
    
    return JSON.parse(responseText) as Partial<ProjectCard>;
  } catch (error) {
    console.error("Error generating card:", error);
    throw error;
  }
};

export const analyzeRisks = async (nfrs: NFR[]): Promise<string> => {
    const nfrsText = nfrs.map(n => `- [${n.category} - ${n.impactLevel} Priority] ${n.title}: ${n.description}`).join('\n');
    
    const prompt = `Analyze these Non-Functional Requirements. Return a strictly professional Markdown report identifying conflicts and technical risks. Do not use emojis. Use standard bullet points.\n\n${nfrsText}`;

    const messages: ChatMessage[] = [
      {
        role: "user",
        content: prompt,
      },
    ];

    const responseText = await callBedrockAPI(messages);
    return responseText || "No risks identified.";
}

export const summarizeIdeas = async (ideas: Idea[], attachments: Attachment[]): Promise<string> => {
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
      for (const file of attachments) {
        prompt += `- ${file.name} (${file.mimeType})\n`;
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
          const responseText = await callBedrockAPI(messages);
          return responseText || "No summary available.";
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
      
      const responseText = await callBedrockAPI(messages);
      return responseText || "No summary available.";
    } catch (e) {
      console.error("Bedrock API Error:", e);
      return "Error analyzing content. Please try again.";
    }
}