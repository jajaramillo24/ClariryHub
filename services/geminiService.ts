import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Idea, NFR, ProjectCard, Attachment } from "../types";

const getApiKey = (): string => {
    const key = process.env.API_KEY;
    if (!key) {
        console.error("API Key is missing. Please set process.env.API_KEY");
        return "";
    }
    return key;
};

let genAIInstance: GoogleGenAI | null = null;

const getGenAI = () => {
  if (!genAIInstance) {
    genAIInstance = new GoogleGenAI({ apiKey: getApiKey() });
  }
  return genAIInstance;
};

// --- Schemas ---

const CARD_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING, description: "Professional technical description of the task." },
    acceptanceCriteria: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of acceptance criteria." 
    },
    subtasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['Backend', 'Frontend', 'Testing', 'DevOps', 'Docs'] },
          storyPoints: { type: Type.NUMBER, description: "Fibonacci number (1, 2, 3, 5, 8...)" }
        }
      }
    },
    totalStoryPoints: { type: Type.NUMBER },
    justification: { type: Type.STRING, description: "Technical justification for the estimate." },
    labels: { type: Type.ARRAY, items: { type: Type.STRING } },
    risks: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ['description', 'acceptanceCriteria', 'subtasks', 'totalStoryPoints', 'justification', 'labels', 'risks']
};

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
  const ai = getGenAI();
  const modelName = 'gemini-2.5-flash';

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
    
    Output strictly structured JSON. Use professional, corporate technical language. Do not use emojis.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: CARD_SCHEMA,
        temperature: 0.2, 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as Partial<ProjectCard>;
  } catch (error) {
    console.error("Error generating card:", error);
    throw error;
  }
};

export const analyzeRisks = async (nfrs: NFR[]): Promise<string> => {
    const ai = getGenAI();
    // Updated to include priority and title
    const nfrsText = nfrs.map(n => `- [${n.category} - ${n.impactLevel} Priority] ${n.title}: ${n.description}`).join('\n');
    
    const prompt = `Analyze these Non-Functional Requirements. Return a strictly professional Markdown report identifying conflicts and technical risks. Do not use emojis. Use standard bullet points.\n\n${nfrsText}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return response.text || "No risks identified.";
}

export const summarizeIdeas = async (ideas: Idea[], attachments: Attachment[]): Promise<string> => {
    const ai = getGenAI();
    const ideasText = ideas.map(i => `- ${i.content}`).join('\n');
    
    // Construct multimodal prompt
    const parts: any[] = [
      { text: `
        You are a Product Engineering Architect.
        Analyze the provided context, which includes brainstormed text notes and attached files (audio transcripts, documents, images).
        
        Group these concepts into professional Epics or Modules.
        Identify functional requirements and potential technical challenges.
        
        Return a clean Markdown report. Do not use emojis.
        
        Brainstormed Notes:
        ${ideasText}
        ` 
      }
    ];

    // Add attachments to parts
    for (const file of attachments) {
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.base64
        }
      });
    }

    try {
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash', // Supports audio, pdf, images
          contents: { parts }
      });
      return response.text || "No summary available.";
    } catch (e) {
      console.error("Gemini Multimodal Error:", e);
      return "Error analyzing files. Please ensure file types are supported (PDF, Audio, Image) and try again.";
    }
}