import type { FastifyInstance } from "fastify";

export const registerChatRoute = (app: FastifyInstance): void => {
  app.post("/chat", async () => {
    return {
      provider: "provider-a",
      model: "manual",
      text: "TODO: wire provider adapter",
      error_code: null
    };
  });
};
