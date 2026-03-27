import type { ChatRequest, ChatResponse, WebProvider } from "../base-provider.js";

export class ProviderAAdapter implements WebProvider {
  public readonly id = "provider-a";

  public async sendChat(request: ChatRequest): Promise<ChatResponse> {
    return {
      provider: this.id,
      model: request.model,
      text: "TODO: implement provider-a playwright flow",
      error_code: null
    };
  }
}
