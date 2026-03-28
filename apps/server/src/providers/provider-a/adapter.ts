import type { ChatRequest, ChatResponse, WebProvider } from "../base-provider.js";
import { getBrowser } from "../../browser/playwright-manager.js";
import { ErrorCodes, type ErrorCode } from "../../core/error-codes.js";
import { providerASelectors } from "./selectors.js";

export class ProviderAAdapter implements WebProvider {
  public readonly id = "provider-a";

  public async sendChat(request: ChatRequest): Promise<ChatResponse> {
    const mode = process.env.PROVIDER_A_MODE ?? "echo";

    if (mode !== "web") {
      return this.sendEcho(request);
    }

    return this.sendWeb(request);
  }

  private sendEcho(request: ChatRequest): ChatResponse {
    const prompt = this.getLatestUserPrompt(request);

    if (!prompt) {
      return {
        provider: this.id,
        model: request.model,
        text: "",
        error_code: ErrorCodes.UNKNOWN
      };
    }

    return {
      provider: this.id,
      model: request.model,
      text: `provider-a echo: ${prompt}`,
      error_code: null
    };
  }

  private async sendWeb(request: ChatRequest): Promise<ChatResponse> {
    const targetUrl = process.env.PROVIDER_A_URL;

    if (!targetUrl) {
      return {
        provider: this.id,
        model: request.model,
        text: "PROVIDER_A_URL is not configured",
        error_code: ErrorCodes.NOT_LOGGED_IN
      };
    }

    const prompt = this.getLatestUserPrompt(request);
    if (!prompt) {
      return {
        provider: this.id,
        model: request.model,
        text: "",
        error_code: ErrorCodes.UNKNOWN
      };
    }

    const timeout = request.timeoutMs ?? 30_000;
    const browser = await getBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout });
      await page.waitForSelector(providerASelectors.input, { timeout });
      await page.fill(providerASelectors.input, prompt);

      const sendButton = page.locator(providerASelectors.sendButton);
      if ((await sendButton.count()) > 0) {
        await sendButton.first().click();
      } else {
        await page.press(providerASelectors.input, "Enter");
      }

      await page.waitForSelector(providerASelectors.messageItem, { timeout });
      const text = (await page.locator(providerASelectors.messageItem).last().innerText()).trim();

      return {
        provider: this.id,
        model: request.model,
        text,
        error_code: null
      };
    } catch (error) {
      return {
        provider: this.id,
        model: request.model,
        text: String(error),
        error_code: this.mapErrorCode(error)
      };
    } finally {
      await context.close();
    }
  }

  private getLatestUserPrompt(request: ChatRequest): string {
    for (let index = request.messages.length - 1; index >= 0; index -= 1) {
      const message = request.messages[index];
      if (!message) {
        continue;
      }

      if (message.role === "user") {
        return message.content.trim();
      }
    }

    return "";
  }

  private mapErrorCode(error: unknown): ErrorCode {
    const message = String(error).toLowerCase();

    if (message.includes("timeout")) {
      return ErrorCodes.TIMEOUT;
    }

    if (message.includes("selector") || message.includes("strict mode violation")) {
      return ErrorCodes.PAGE_CHANGED;
    }

    return ErrorCodes.UNKNOWN;
  }
}
