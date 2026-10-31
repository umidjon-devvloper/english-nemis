import { authMiddleware } from "../middleware/auth.js";
import {
  chat,
  chatStream,
  listConversations,
  getConversation,
  deleteConversation,
  writingFeedback,
  speakingFeedback,
} from "../controllers/practice.controller.js";

export default async function practiceRoutes(app) {
  app.addHook("preHandler", authMiddleware);

  app.post("/chat", chat);
  app.post("/chat/stream", chatStream);

  app.get("/conversations", listConversations);
  app.get("/conversations/:id", getConversation);
  app.delete("/conversations/:id", deleteConversation);

  app.post("/writing", writingFeedback);
  app.post("/speaking", speakingFeedback);
}
