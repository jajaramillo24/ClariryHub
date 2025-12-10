export enum Stage {
  FREE_JAM = 'FREE_JAM',
  NON_FUNCTIONAL = 'NON_FUNCTIONAL',
  CARD_CREATION = 'CARD_CREATION',
  JIRA_EXPORT = 'JIRA_EXPORT'
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  base64: string; // Raw base64 data without prefix
}

export interface Idea {
  id: string;
  content: string;
  category?: string;
}

export interface NFR {
  id: string;
  category: string;
  title: string;
  description: string;
  impactLevel: 'Low' | 'Medium' | 'High';
}

export interface Subtask {
  title: string;
  type: 'Backend' | 'Frontend' | 'Testing' | 'DevOps' | 'Docs';
  storyPoints: number;
  completed: boolean;
}

export interface ProjectCard {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  subtasks: Subtask[];
  totalStoryPoints: number;
  justification: string;
  labels: string[];
  risks: string[];
  status: 'Draft' | 'Ready' | 'Exported';
}

export interface StageConfig {
  id: Stage;
  label: string;
  description: string;
}

export interface CsvColumn {
  id: string;
  header: string;
  enabled: boolean;
  field: keyof ProjectCard | 'subtasks_count' | 'issue_type'; // mapped fields
}