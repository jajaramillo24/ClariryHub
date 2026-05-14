import { GoogleGenerativeAI } from "@google/generative-ai";
import { Idea, NFR, ProjectCard, Attachment } from "../types";
import { processDocumentAttachment, isWordDocument, isExcelDocument } from "./documentProcessor";

const API_KEY = import.meta.env.VITE_API_KEY || "";
const MODEL_NAME = "gemini-2.0-flash";

const genAI = new GoogleGenerativeAI(API_KEY);

interface ChatMessage {
  role: "user" | "model";
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Single-shot call (no streaming). Returns the full text response.
 */
const callGemini = async (
  messages: ChatMessage[],
  systemInstruction?: string
): Promise<string> => {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    ...(systemInstruction ? { systemInstruction } : {}),
  });

  // Split off any leading "model" turns to build proper history
  const history = messages.slice(0, -1);
  const lastMessage = messages[messages.length - 1];

  const chat = model.startChat({
    history: history.map((m) => ({
      role: m.role,
      parts: m.parts as any,
    })),
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  });

  const result = await chat.sendMessage(lastMessage.parts as any);
  return result.response.text();
};

/**
 * Streaming call. Calls `onChunk` for each text delta, returns the full text.
 */
const callGeminiStream = async (
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  systemInstruction?: string
): Promise<string> => {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    ...(systemInstruction ? { systemInstruction } : {}),
  });

  const history = messages.slice(0, -1);
  const lastMessage = messages[messages.length - 1];

  const chat = model.startChat({
    history: history.map((m) => ({
      role: m.role,
      parts: m.parts as any,
    })),
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  });

  const result = await chat.sendMessageStream(lastMessage.parts as any);

  let fullContent = "";
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      fullContent += text;
      onChunk(text);
    }
  }

  return fullContent;
};

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

const cleanJsonResponse = (text: string): string => {
  let cleaned = text.trim();

  if (cleaned.startsWith("```json\n")) {
    cleaned = cleaned.slice(8);
  } else if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```\n")) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith("\n```")) {
    cleaned = cleaned.slice(0, -4);
  } else if (cleaned.endsWith("```")) {
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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
  const ideasText = contextIdeas.map((i) => `- ${i.content}`).join("\n");
  const nfrsText = contextNfrs
    .map(
      (n) =>
        `- [${n.category} - ${n.impactLevel} Priority] ${n.title}: ${n.description}`
    )
    .join("\n");

  const scopeInstructions = `
    SCOPE OF WORK:
    - Backend Development: ${options.includeBackend ? "REQUIRED" : "EXCLUDED (Do not generate backend tasks)"}
    - Frontend Development: ${options.includeFrontend ? "REQUIRED" : "EXCLUDED (Do not generate frontend tasks)"}
    - Testing/QA: ${options.includeTesting ? "REQUIRED" : "EXCLUDED (Do not generate testing tasks)"}
    - Documentation: ${options.includeDocs ? "REQUIRED" : "EXCLUDED (Do not generate doc tasks)"}
  `;

  const estimationMode = options.detailedEstimation
    ? `
    ESTIMATION MODE: DETAILED (Full Production-Ready)
    - Include all edge cases, error handling, and comprehensive testing
    - Consider security, performance optimization, and full documentation
    - Include code review time, integration testing, and deployment preparation
    - Add monitoring, logging, and observability tasks
    - Plan for technical debt prevention and refactoring needs
  `
    : `
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
      { role: "user", parts: [{ text: prompt }] },
    ];

    let responseText: string;
    if (onChunk) {
      responseText = await callGeminiStream(messages, onChunk);
    } else {
      responseText = await callGemini(messages);
    }

    if (!responseText) throw new Error("No response from AI");

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

export const analyzeRisks = async (
  nfrs: NFR[],
  onChunk?: (chunk: string) => void
): Promise<string> => {
  const nfrsText = nfrs
    .map(
      (n) =>
        `- [${n.category} - ${n.impactLevel} Priority] ${n.title}: ${n.description}`
    )
    .join("\n");

  const prompt = `Analyze these Non-Functional Requirements. Return a strictly professional Markdown report identifying conflicts and technical risks. Do not use emojis. Use standard bullet points.\n\n${nfrsText}`;

  const messages: ChatMessage[] = [
    { role: "user", parts: [{ text: prompt }] },
  ];

  if (onChunk) {
    return await callGeminiStream(messages, onChunk);
  } else {
    const responseText = await callGemini(messages);
    return responseText || "No risks identified.";
  }
};

export const summarizeIdeas = async (
  ideas: Idea[],
  attachments: Attachment[],
  onChunk?: (chunk: string) => void
): Promise<string> => {
  const ideasText = ideas.map((i) => `- ${i.content}`).join("\n");

  let promptText = `
        You are a Product Engineering Architect.
        Analyze the provided context, which includes brainstormed text notes.
        
        Group these concepts into professional Epics or Modules.
        Identify functional requirements and potential technical challenges.
        
        Return a clean Markdown report. Do not use emojis.
        
        Brainstormed Notes:
        ${ideasText}
    `;

  // Build the parts array for the user message
  const parts: ChatMessage["parts"] = [];

  if (attachments.length > 0) {
    promptText += `\n\nAttached Files (${attachments.length}):\n`;

    // Process Word and Excel documents — extract text and append to prompt
    for (const file of attachments) {
      if (
        isWordDocument(file.mimeType, file.name) ||
        isExcelDocument(file.mimeType, file.name)
      ) {
        try {
          const extractedText = await processDocumentAttachment(file);
          if (extractedText) {
            promptText += `\n--- Content from ${file.name} ---\n${extractedText}\n`;
          }
        } catch (error) {
          console.error(`Failed to process ${file.name}:`, error);
          promptText += `- ${file.name} (${file.mimeType}) - Could not extract text\n`;
        }
      } else if (!file.mimeType.startsWith("image/")) {
        promptText += `- ${file.name} (${file.mimeType})\n`;
      }
    }

    // Append image attachments as inline data parts
    const imageAttachments = attachments.filter((a) =>
      a.mimeType.startsWith("image/")
    );
    for (const img of imageAttachments) {
      parts.push({
        inlineData: { mimeType: img.mimeType, data: img.base64 },
      });
    }
  }

  // Always add the text part first
  parts.unshift({ text: promptText });

  const messages: ChatMessage[] = [{ role: "user", parts }];

  try {
    if (onChunk) {
      return await callGeminiStream(messages, onChunk);
    } else {
      const responseText = await callGemini(messages);
      return responseText || "No summary available.";
    }
  } catch (e) {
    console.error("Gemini API Error:", e);
    return "Error analyzing content. Please try again.";
  }
};

export const generateNFRsFromSummary = async (
  summary: string,
  ideas: Idea[]
): Promise<NFR[]> => {
  const ideasText = ideas.map((i) => `- ${i.content}`).join("\n");

  const prompt = `
You are a Product Engineering Architect specialized in Non-Functional Requirements.
Based on the executive summary below, identify and extract all Non-Functional Requirements (NFRs).

Categories to consider:
- Security: Authentication, authorization, data protection, encryption
- Performance: Response times, throughput, latency requirements
- Scalability: Growth capacity, load handling, horizontal/vertical scaling
- Accessibility: WCAG compliance, screen readers, keyboard navigation
- Privacy: GDPR, data handling, user consent, data retention
- Reliability: Uptime, fault tolerance, backup/recovery, monitoring
- Storage: Database requirements, data retention, backup strategies
- Infrastructure: Hosting, deployment, CI/CD, cloud services

Original Ideas Context:
${ideasText}

Executive Summary:
${summary}

Return ONLY a valid JSON object with this structure:
{
  "nfrs": [
    {
      "category": "Security|Performance|Scalability|Accessibility|Privacy|Reliability|Storage|Infrastructure",
      "title": "string (concise requirement title - NUMBER IT: NFR-1, NFR-2, etc.)",
      "description": "string (detailed explanation)",
      "impactLevel": "Low|Medium|High"
    }
  ]
}

Generate 3-10 NFRs depending on the summary content. Be specific and actionable.
IMPORTANT: Number each NFR title sequentially (e.g., "NFR-1: Authentication", "NFR-2: Response Time", etc.)
`;

  let responseText = "";
  try {
    const messages: ChatMessage[] = [
      { role: "user", parts: [{ text: prompt }] },
    ];

    responseText = await callGemini(messages);

    const cleanedResponse = cleanJsonResponse(responseText);
    const parsed = JSON.parse(cleanedResponse);

    const nfrs: NFR[] = (parsed.nfrs || []).map((nfr: any, index: number) => {
      let title = nfr.title || "Untitled NFR";
      if (!title.match(/^NFR-\d+:/)) {
        title = `NFR-${index + 1}: ${title}`;
      }

      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        category: nfr.category || "Security",
        title,
        description: nfr.description || "",
        impactLevel: nfr.impactLevel || "Medium",
      };
    });

    return nfrs;
  } catch (e) {
    console.error("Failed to generate NFRs from summary:", e);
    console.error("Raw response:", responseText);
    throw new Error("Could not generate NFRs. Please try again.");
  }
};

export const generateCardsFromSummary = async (
  summary: string,
  ideas: Idea[],
  nfrs: NFR[]
): Promise<ProjectCard[]> => {
  const ideasText = ideas.map((i) => `- ${i.content}`).join("\n");
  const nfrsText = nfrs
    .map((n) => `[${n.category}] ${n.title}: ${n.description}`)
    .join("\n");

  const prompt = `
You are a Product Engineering Architect.
Based on the executive summary below, generate a numbered list of Epic/Feature cards for the product backlog.

Extract all major Epics or Features mentioned in the summary and create a simple enumerated card for each.
Each card should be numbered (e.g., "1. User Authentication", "2. Dashboard Design") and include:
- title: Numbered epic/feature name (e.g., "1. User Authentication System")
- description: Brief 1-2 sentence description of the epic's purpose

DO NOT include:
- acceptanceCriteria (will be defined later)
- subtasks (will be generated later)
- totalStoryPoints (will be calculated later)
- justification (will be added later)
- labels (will be tagged later)
- risks (will be assessed later)

Original Ideas Context:
${ideasText}

NFRs Context:
${nfrsText || "None specified"}

Executive Summary:
${summary}

Return ONLY a valid JSON object with this structure:
{
  "cards": [
    {
      "title": "1. Epic Title",
      "description": "Brief description of this epic"
    },
    {
      "title": "2. Another Epic",
      "description": "Brief description"
    }
  ]
}

Generate between 5-12 enumerated epics depending on the summary content. Number each epic sequentially (1, 2, 3, etc.).
`;

  let responseText = "";
  try {
    const messages: ChatMessage[] = [
      { role: "user", parts: [{ text: prompt }] },
    ];

    responseText = await callGemini(messages);

    const cleanedResponse = cleanJsonResponse(responseText);
    const parsed = JSON.parse(cleanedResponse);

    const cards: ProjectCard[] = (parsed.cards || []).map((card: any) => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: card.title || "Untitled Epic",
      description: card.description || "",
      acceptanceCriteria: [],
      subtasks: [],
      totalStoryPoints: 0,
      justification: "",
      labels: [],
      risks: [],
      status: "Draft" as const,
    }));

    return cards;
  } catch (e) {
    console.error("Failed to generate cards from summary:", e);
    console.error("Raw response:", responseText);
    throw new Error("Could not generate backlog cards. Please try again.");
  }
};