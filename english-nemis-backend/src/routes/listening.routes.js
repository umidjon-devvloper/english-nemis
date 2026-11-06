import { authMiddleware } from "../middleware/auth.js";
import {
  listListeningClips,
  submitListeningAnswers,
} from "../controllers/listening.controller.js";

export default async function listeningRoutes(app) {
  app.addHook("preHandler", authMiddleware);

  app.get("/", listListeningClips);
  app.post("/:id/submit", submitListeningAnswers);
}
