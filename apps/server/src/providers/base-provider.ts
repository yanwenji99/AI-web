export type ChatRequest = {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  timeoutMs?: number;
};

export type ChatResponse = {
  provider: string;
  model: string;
  text: string;
  error_code: string | null;
};

export interface WebProvider {
  id: string;
  sendChat(request: ChatRequest): Promise<ChatResponse>;
}
