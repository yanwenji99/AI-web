import type { FastifyInstance } from "fastify";
import { ErrorCodes, type ErrorCode } from "../core/error-codes.js";
import type { ChatRequest, ChatResponse, WebProvider } from "../providers/base-provider.js";
import { ProviderAAdapter } from "../providers/provider-a/adapter.js";
import { ProviderBAdapter } from "../providers/provider-b/adapter.js";

const providerA = new ProviderAAdapter();
const providerB = new ProviderBAdapter();

const providers: Record<string, WebProvider> = {
  [providerA.id]: providerA,
  [providerB.id]: providerB
};

type ChatRouteBody = {
  provider?: string;
  model?: string;
  timeoutMs?: number;
  messages?: ChatRequest["messages"];
};

type ValidatedChatBody = {
  provider?: string;
  model: string;
  timeoutMs?: number;
  messages: ChatRequest["messages"];
};

const buildErrorResponse = (
  provider: string,
  model: string,
  text: string,
  errorCode: ErrorCode
): ChatResponse => {
  return {
    provider,
    model,
    text,
    error_code: errorCode
  };
};

const isValidChatBody = (body: unknown): body is ValidatedChatBody => {
  if (!body || typeof body !== "object") {
    return false;
  }

  const maybeRequest = body as ChatRouteBody;
  if (typeof maybeRequest.model !== "string" || maybeRequest.model.length === 0) {
    return false;
  }

  if (!Array.isArray(maybeRequest.messages) || maybeRequest.messages.length === 0) {
    return false;
  }

  return maybeRequest.messages.every((message) => {
    if (!message || typeof message !== "object") {
      return false;
    }

    const role = (message as { role?: unknown }).role;
    const content = (message as { content?: unknown }).content;

    return (
      (role === "system" || role === "user" || role === "assistant") &&
      typeof content === "string" &&
      content.length > 0
    );
  });
};

export const registerChatRoute = (app: FastifyInstance): void => {
  app.post("/chat", async (request, reply) => {
    const rawBody = request.body as ChatRouteBody | null | undefined;
    const fallbackProvider = rawBody?.provider ?? providerA.id;
    const fallbackModel = rawBody?.model ?? "default";

    if (!isValidChatBody(request.body)) {
      reply.code(400);
      return buildErrorResponse(
        fallbackProvider,
        fallbackModel,
        "Invalid request body. Expect { provider?, model, messages[], timeoutMs? }.",
        ErrorCodes.UNKNOWN
      );
    }

    const providerId = request.body.provider ?? providerA.id;
    const selectedProvider = providers[providerId];

    if (!selectedProvider) {
      reply.code(400);
      return buildErrorResponse(
        providerId,
        request.body.model,
        `Unsupported provider: ${providerId}`,
        ErrorCodes.UNKNOWN
      );
    }

    const chatRequest: ChatRequest = {
      model: request.body.model,
      messages: request.body.messages
    };

    if (request.body.timeoutMs !== undefined) {
      chatRequest.timeoutMs = request.body.timeoutMs;
    }

    try {
      const response = await selectedProvider.sendChat(chatRequest);
      return response;
    } catch (error) {
      reply.code(500);
      return buildErrorResponse(
        selectedProvider.id,
        chatRequest.model,
        String(error),
        ErrorCodes.UNKNOWN
      );
    }
  });
};
