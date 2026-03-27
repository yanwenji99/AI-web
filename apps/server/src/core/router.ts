import type { FastifyInstance } from "fastify";
import { registerChatRoute } from "../routes/chat.js";
import { registerModelsRoute } from "../routes/models.js";

export const registerRoutes = (app: FastifyInstance): void => {
  registerChatRoute(app);
  registerModelsRoute(app);
};
