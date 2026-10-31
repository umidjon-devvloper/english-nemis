import { authMiddleware } from "../middleware/auth.js";
import {
  getVocabularyBooks,
  getVocabularyUnits,
  getVocabularyUnitDetail,
  submitUnitQuiz,
  submitReadingQuiz,
} from "../controllers/vocabulary.controller.js";
import {
  getDailyPack,
  submitAnswer,
  completeDailyPack,
  getProgress,
  getOptions,
} from "../controllers/daily-vocab.controller.js";

export default async function vocabularyRoutes(app) {
  app.get("/books", getVocabularyBooks);

  app.get("/books/:bookId/units", getVocabularyUnits);

  app.get("/units/:unitId", getVocabularyUnitDetail);

  app.post("/units/:unitId/quiz", {
    preHandler: authMiddleware,
    handler: submitUnitQuiz,
  });

  app.post("/units/:unitId/reading-quiz", {
    preHandler: authMiddleware,
    handler: submitReadingQuiz,
  });

  // Daily 100-word pack
  app.get("/daily", {
    preHandler: authMiddleware,
    handler: getDailyPack,
  });

  app.post("/daily/answer", {
    preHandler: authMiddleware,
    handler: submitAnswer,
  });

  app.post("/daily/complete", {
    preHandler: authMiddleware,
    handler: completeDailyPack,
  });

  app.get("/daily/progress", {
    preHandler: authMiddleware,
    handler: getProgress,
  });

  app.get("/daily/options", {
    preHandler: authMiddleware,
    handler: getOptions,
  });
}
