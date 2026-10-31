import {
  register,
  login,
  logout,
  getMe,
  updateMe,
} from "../controllers/auth.controller.js";

import { authMiddleware } from "../middleware/auth.js";

export default async function authRoutes(app) {
  app.post("/register", register);

  app.post("/login", login);

  app.get("/me", {
    preHandler: authMiddleware,
    handler: getMe,
  });

  app.patch("/me", {
    preHandler: authMiddleware,
    handler: updateMe,
  });

  app.post("/logout", {
    preHandler: authMiddleware,
    handler: logout,
  });
}
