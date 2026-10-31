import { authMiddleware } from "../middleware/auth.js";

import {
  recordSession,
  getStats,
  getStreak,
} from "../controllers/sessions.controller.js";

export default async function sessionsRoutes(app) {
  app.addHook("preHandler", authMiddleware);

  app.post("/", recordSession);
  app.get("/stats", getStats);
  app.get("/streak", getStreak);
}
