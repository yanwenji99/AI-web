import Fastify from "fastify";
import { registerRoutes } from "./core/router.js";

const app = Fastify({ logger: true });

registerRoutes(app);

const start = async () => {
  try {
    await app.listen({ host: "127.0.0.1", port: 3000 });
    app.log.info("Server started on http://127.0.0.1:3000");
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
