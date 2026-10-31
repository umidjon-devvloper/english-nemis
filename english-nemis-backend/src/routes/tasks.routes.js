import { authMiddleware } from "../middleware/auth.js";

import {
  getTodayTasks,
  getTaskById,
  updateTaskStatus,
} from "../controllers/tasks.controller.js";

export default async function tasksRoutes(app) {
  app.addHook("preHandler", authMiddleware);

  app.get("/today", getTodayTasks);

  app.get("/:id", getTaskById);

  app.patch("/:id", updateTaskStatus);
}
