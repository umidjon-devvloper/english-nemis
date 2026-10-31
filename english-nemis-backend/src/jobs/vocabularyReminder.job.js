import cron from "node-cron";
import { Telegraf } from "telegraf";

import User from "../models/User.js";
import DailyVocabulary from "../models/DailyVocabulary.js";
import UserLanguageProgress from "../models/UserLanguageProgress.js";
import { todayDate } from "../services/vocabulary/daily-pack.js";

/**
 * Daily nudge at 09:00 Tashkent: for every user who has Telegram
 * connected, send them a short message with today's active language
 * and whether they've started yet.
 *
 * This job only reads — the pack is created on-demand when the user
 * actually opens the quiz page, so we never prematurely allocate
 * resources for inactive accounts.
 */
export function startVocabularyReminderJob() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn(
      "⚠️ Vocabulary reminder cron skipped: no TELEGRAM_BOT_TOKEN",
    );
    return;
  }

  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  const webUrl = process.env.WEB_URL || "http://localhost:3003";

  cron.schedule(
    "0 9 * * *",
    async () => {
      console.log("📬 Running vocabulary reminder cron...");

      try {
        const users = await User.find({
          telegramChatId: { $ne: null },
        }).lean();

        let sent = 0;
        let skipped = 0;

        for (const user of users) {
          try {
            const progress = await UserLanguageProgress.find({
              user: user._id,
            }).lean();

            const english = progress.find(
              (p) => p.language === "english",
            );
            const german = progress.find(
              (p) => p.language === "german",
            );

            // Pick which language to nudge: german if unlocked, else english.
            const activeLanguage = german?.unlocked
              ? "german"
              : "english";

            const date = todayDate(user.timezone);
            const todaysPack = await DailyVocabulary.findOne({
              user: user._id,
              date,
              language: activeLanguage,
            }).select("completed stats words");

            const alreadyDone = todaysPack?.completed;
            if (alreadyDone) {
              skipped++;
              continue;
            }

            const flag = activeLanguage === "english" ? "🇬🇧" : "🇩🇪";
            const label =
              activeLanguage === "english" ? "English" : "German";

            const message = [
              `${flag} *Bugungi ${label} 100 so'z pak tayyor*`,
              "",
              `Kundalik lug'at mashqni yakunlang va darajangizni oshiring.`,
              german?.unlocked
                ? ""
                : "💡 Nemis tilini ochish uchun inglizchada 100% ball oling.",
              "",
              `👉 ${webUrl}/dashboard/vocabulary/daily`,
            ]
              .filter(Boolean)
              .join("\n");

            await bot.telegram.sendMessage(
              user.telegramChatId,
              message,
              { parse_mode: "Markdown" },
            );
            sent++;
          } catch (userError) {
            console.error(
              `  × user ${user._id}:`,
              userError.message,
            );
          }
        }

        console.log(
          `✅ Vocabulary reminder sent: ${sent} nudges, ${skipped} already done`,
        );
      } catch (error) {
        console.error("❌ Vocabulary reminder cron failed:", error);
      }
    },
    {
      timezone: "Asia/Tashkent",
      noOverlap: true,
    },
  );

  console.log(
    "📬 Vocabulary reminder cron armed (09:00 Asia/Tashkent)",
  );
}
