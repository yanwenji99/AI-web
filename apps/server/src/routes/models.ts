import type { FastifyInstance } from "fastify";

export const registerModelsRoute = (app: FastifyInstance): void => {
  app.get("/models", async () => {
    return {
      providers: [
        { id: "provider-a", models: ["default"] },
        { id: "provider-b", models: ["default"] }
      ]
    };
  });
};
