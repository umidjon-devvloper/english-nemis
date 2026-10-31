import { Telegraf, Markup } from "telegraf";

import TelegramConnection from "../../models/TelegramConnection.js";

import {
  generateDailyVocabulary,
} from "../vocabulary/daily-vocabulary.js";

import {
  getNextQuestion,
} from "../vocabulary/quiz-generator.js";

import {
  checkVocabularyAnswer,
} from "../vocabulary/quiz-checker.js";
import { confirmTelegramLink } from "./link.js";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const getToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
  }).format(new Date());

async function sendQuestion(ctx, userId) {
  const date = getToday();

  const question = await getNextQuestion(userId, date);

  if (question.completed) {
    await ctx.reply(
      "🎉 Tabriklaymiz! Bugungi barcha 40 ta so‘zni yodladingiz!",
    );
    return;
  }

  const buttons = question.options.map((option, index) => [
    Markup.button.callback(
      `${index + 1}. ${option}`,
      `vocab:${question.questionId}:${index}`,
    ),
  ]);

  // Savol uchun javob variantlarini vaqtincha saqlash
  // productionda bu ma'lumotni DB/Redisda saqlash kerak.
  questionCache.set(
    `${ctx.chat.id}:${question.questionId}`,
    question.options,
  );

  await ctx.reply(
    `📚 ${question.language.toUpperCase()}\n\n` +
      `${question.question}\n\n` +
      `Progress: ${question.progress.mastered}/${question.progress.total}`,
    Markup.inlineKeyboard(buttons),
  );
}

const questionCache = new Map();

bot.start(async (ctx) => {
  const token = ctx.startPayload;

  if (!token) {
    return ctx.reply(
      "🔗 Avval LinguaCoach AI hisobingizni Telegram bilan ulang.",
    );
  }

  try {
   await confirmTelegramLink({
    token,
    chatId: ctx.chat.id,
    username: ctx.from.username,
    firstName: ctx.from.first_name,
    lastName: ctx.from.last_name,
    });

    await ctx.reply(
      "✅ Telegram hisobingiz LinguaCoach AI bilan muvaffaqiyatli ulandi!",
    );
  } catch (error) {
    console.error("Telegram linking error:", error);

    await ctx.reply(
      "❌ Ulanish havolasi eskirgan yoki noto‘g‘ri. Saytdan qayta Connect bosing.",
    );
  }
});

bot.command("quiz", async (ctx) => {
  const connection = await TelegramConnection.findOne({
    chatId: String(ctx.chat.id),
  });

  if (!connection) {
    await ctx.reply("Avval Telegram hisobingizni ulang.");
    return;
  }

  await generateDailyVocabulary(connection.user);

  await sendQuestion(ctx, connection.user);
});

bot.action(/^vocab:([^:]+):(\d+)$/, async (ctx) => {
  const [, wordId, optionIndex] = ctx.match;

  const connection = await TelegramConnection.findOne({
    chatId: String(ctx.chat.id),
  });

  if (!connection) {
    await ctx.answerCbQuery("Hisob ulanmagan");
    return;
  }

  const key = `${ctx.chat.id}:${wordId}`;
  const options = questionCache.get(key);

  if (!options) {
    await ctx.answerCbQuery("Savol muddati tugagan");
    return;
  }

  const answer = options[Number(optionIndex)];

  if (!answer) {
    await ctx.answerCbQuery("Noto‘g‘ri variant");
    return;
  }

  const result = await checkVocabularyAnswer({
    userId: connection.user,
    date: getToday(),
    wordId,
    answer,
  });

  questionCache.delete(key);

  await ctx.answerCbQuery(
    result.correct ? "✅ To‘g‘ri!" : "❌ Noto‘g‘ri!",
  );

  await ctx.reply(
    result.correct
      ? `✅ To‘g‘ri! ${result.mastered}/${result.total}`
      : `❌ To‘g‘ri javob: ${result.correctAnswer}`,
  );

  await sendQuestion(ctx, connection.user);
});

bot.command("progress", async (ctx) => {
  const connection = await TelegramConnection.findOne({
    chatId: String(ctx.chat.id),
  });

  if (!connection) {
    await ctx.reply("Hisob ulanmagan.");
    return;
  }

  const daily = await generateDailyVocabulary(
    connection.user,
  );

  const mastered = daily.words.filter(
    (item) => item.mastered,
  ).length;

  await ctx.reply(
    `📊 Bugungi natija: ${mastered}/${daily.words.length}`,
  );
});

export async function startTelegramBot() {
  await bot.launch();

  console.log("Telegram bot started");
}

export { bot };