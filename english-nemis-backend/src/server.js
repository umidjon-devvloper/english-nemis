import "dotenv/config";

import { buildApp } from "./app.js";
import { connectDB } from "./config/database.js";
import { startTelegramBot } from "./services/telegram/bot.js";
import { startVocabularyReminderJob } from "./jobs/vocabularyReminder.job.js";

const start = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is required");
    }

    if (
      !process.env.JWT_SECRET ||
      process.env.JWT_SECRET.length < 32
    ) {
      throw new Error("JWT_SECRET must contain at least 32 characters");
    }

    if (!process.env.WEB_URL) {
      throw new Error("WEB_URL is required");
    }

    // 1. MongoDB
    await connectDB();
    console.log("✅ MongoDB connected");

    // 2. Fastify
    const app = await buildApp();

    // 3. HTTP serverni ishga tushiramiz
    await app.listen({
      port: Number(process.env.PORT || 4000),
      host: "0.0.0.0",
    });

    console.log("🚀 Backend running on port 4000");

    // 4. Telegram botni alohida ishga tushiramiz
    if (process.env.TELEGRAM_BOT_TOKEN) {
      console.log("🤖 Starting Telegram bot...");

      startTelegramBot().catch((error) => {
        console.error(
          "❌ Telegram bot failed:",
          error.message,
        );
      });
    } else {
      console.warn(
        "⚠️ TELEGRAM_BOT_TOKEN not configured",
      );
    }

    // 5. Daily vocabulary nudge
    startVocabularyReminderJob();
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
};

start();