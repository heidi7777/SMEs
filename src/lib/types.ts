export type ModuleKey = "creative" | "visual" | "comms" | "marketing";

export type ChatRole = "user" | "assistant" | "system";

export type Chip = {
  id: string;
  text: string;
};

export type Message = {
  id: string;
  role: Exclude<ChatRole, "system">;
  content: string;
  createdAt: number;
  isError?: boolean;
  chips?: Chip[];
  isFavorite?: boolean;
};

export type Conversation = {
  id: string;
  moduleKey: ModuleKey;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

export type AssetTemplate = {
  id: string;
  folder?: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

export interface ExpertConfig {
  id: string;
  name: string;
  description: string;
  defaultTemplate: string;
  systemPrompt: string;
}

export type AppState = {
  version: 1;
  conversations: Conversation[];
  assets: AssetTemplate[];
};

