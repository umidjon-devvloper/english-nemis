import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";

import authRoutes from "./routes/auth.routes.js";
import adminAiRoutes from "./routes/admin-ai.routes.js";
import tasksRoutes from "./routes/tasks.routes.js";
import sessionsRoutes from "./routes/sessions.routes.js";
import practiceRoutes from "./routes/practice.routes.js";
import vocabularyRoutes from "./routes/vocabulary.routes.js";
import telegramRoutes from "./routes/telegram.routes.js";
export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: process.env.WEB_URL,
    credentials: true,
  });

  await app.register(cookie);

  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: "1 minute",
  });

  app.get("/health", async () => ({
    success: true,
    status: "ok",
  }));

  await app.register(authRoutes, {
    prefix: "/api/v1/auth",
  });
  await app.register(adminAiRoutes, {
  prefix: "/api/v1/admin",
  });
  await app.register(tasksRoutes, {
  prefix: "/api/v1/tasks",
});
await app.register(sessionsRoutes, {
  prefix: "/api/v1/sessions",
});
await app.register(practiceRoutes, {
  prefix: "/api/v1/practice",
});
await app.register(vocabularyRoutes, {
  prefix: "/api/v1/vocabulary",
});
await app.register(telegramRoutes, {
  prefix: "/api/telegram",
});
  return app;
}