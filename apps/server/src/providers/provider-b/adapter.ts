import type { ChatRequest, ChatResponse, WebProvider } from "../base-provider.js";

export class ProviderBAdapter implements WebProvider {
  public readonly id = "provider-b";

  public async sendChat(request: ChatRequest): Promise<ChatResponse> {
    return {
      provider: this.id,
      model: request.model,
      text: "TODO: implement provider-b playwright flow",
      error_code: null
    };
  }
}
