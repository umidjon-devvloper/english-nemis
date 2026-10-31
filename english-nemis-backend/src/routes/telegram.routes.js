import TelegramConnection from "../models/TelegramConnection.js";
import { createTelegramLink } from "../services/telegram/link.js";
import { authMiddleware } from "../middleware/auth.js";

export default async function telegramRoutes(app) {
  // Telegram akkauntni ulash
  app.post(
    "/connect",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const userId = request.user?.id ?? request.user?._id;

      if (!userId) {
        return reply.code(401).send({
          success: false,
          message: "Unauthorized",
        });
      }

      const result = await createTelegramLink(userId);

      return {
        success: true,
        ...result,
      };
    },
  );

  // Telegram ulanish holati
  app.get(
  "/status",
  {
    preHandler: authMiddleware,
  },
  async (request, reply) => {
    const userId = request.user?.id ?? request.user?._id;

    if (!userId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized",
      });
    }

    const connection = await TelegramConnection.findOne({
      user: userId,
    }).lean();

    if (!connection) {
      return {
        success: true,
        connected: false,
        telegram: null,
      };
    }

    return {
      success: true,
      connected: true,
      telegram: {
        firstName: connection.firstName,
        lastName: connection.lastName,
        username: connection.username,
        telegramId: connection.chatId,
        notificationsEnabled: connection.notificationsEnabled,
        reminderHours: connection.reminderHours,
        connectedAt: connection.createdAt,
      },
    };
  },
);
}