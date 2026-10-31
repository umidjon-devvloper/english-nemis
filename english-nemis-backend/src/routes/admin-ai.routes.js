import {
  getAiConfig,
  updateAiConfig,
} from "../controllers/admin-ai.controller.js";

import { authMiddleware } from "../middleware/auth.js";

async function adminOnly(request, reply) {
  if (request.user?.role !== "admin") {
    return reply.code(403).send({
      success: false,
      message: "Admin access required",
    });
  }
}

export default async function adminAiRoutes(app) {
  app.addHook("preHandler", authMiddleware);
  app.addHook("preHandler", adminOnly);

  app.get("/ai-config", getAiConfig);
  app.patch("/ai-config", updateAiConfig);
}