import { z } from "zod";

import UserLanguageProgress from "../models/UserLanguageProgress.js";
import DailyVocabulary from "../models/DailyVocabulary.js";
import {
  completePack,
  ensureLanguageProgress,
  getOrCreateDailyPack,
  recordAnswer,
  todayDate,
  PACK_SIZE,
} from "../services/vocabulary/daily-pack.js";

const packQuery = z.object({
  language: z.enum(["english", "german"]).optional(),
});

const answerSchema = z.object({
  language: z.enum(["english", "german"]),
  wordId: z.string().min(1),
  answer: z.string().min(1).max(200),
});

const completeSchema = z.object({
  language: z.enum(["english", "german"]),
});

function serializePack(pack) {
  const answered = pack.words.filter((w) => w.answered).length;
  const correct = pack.words.filter((w) => w.correct).length;

  return {
    id: pack._id.toString(),
    date: pack.date,
    language: pack.language,
    size: pack.size,
    completed: pack.completed,
    completedAt: pack.completedAt,
    score: pack.score,
    stats: {
      total: pack.words.length,
      answered,
      correct,
      remaining: pack.words.length - answered,
    },
    // Return only the fields the client needs — answers come later.
    words: pack.words.map((w) => ({
      wordId: w.wordId.toString(),
      word: w.word,
      pronunciation: w.pronunciation || "",
      example: w.example || "",
      answered: w.answered,
      correct: w.correct,
      userAnswer: w.userAnswer,
      // Reveal the translation only after the user answered it, so the
      // review screen can show the right answer alongside what they typed.
      translationUz: w.answered ? w.translationUz : null,
    })),
  };
}

/**
 * GET /api/v1/vocabulary/daily?language=english
 * Returns both language progress rows plus today's active pack.
 * If no language is specified, defaults to english (which is always unlocked).
 */
export async function getDailyPack(request, reply) {
  const query = packQuery.safeParse(request.query);
  if (!query.success) {
    return reply.code(400).send({
      success: false,
      message: "Invalid query",
    });
  }

  const user = request.user;
  const userId = user._id ?? user.id;

  const progress = await ensureLanguageProgress(userId);

  // Choose the language to serve: explicit > first unlocked.
  const requested = query.data.language;
  const language =
    requested ??
    (progress.english.unlocked ? "english" : "german");

  try {
    const pack = await getOrCreateDailyPack({
      userId,
      language,
      timezone: user.timezone,
      packSize: user.dailyPackSize,
    });

    // Fetch last 7 completed packs for both languages so the client can
    // draw a small score history chart.
    const [englishHistory, germanHistory] = await Promise.all([
      DailyVocabulary.find({
        user: userId,
        language: "english",
        completed: true,
      })
        .sort({ date: -1 })
        .limit(7)
        .select("date score words")
        .lean(),
      DailyVocabulary.find({
        user: userId,
        language: "german",
        completed: true,
      })
        .sort({ date: -1 })
        .limit(7)
        .select("date score words")
        .lean(),
    ]);

    const shapeHistory = (rows) =>
      rows
        .map((r) => ({
          date: r.date,
          score: r.score,
          total: r.words?.length ?? 0,
          correct: r.words?.filter((w) => w.correct).length ?? 0,
        }))
        .reverse();

    return reply.send({
      success: true,
      date: todayDate(user.timezone),
      packSize: user.dailyPackSize ?? PACK_SIZE,
      history: {
        english: shapeHistory(englishHistory),
        german: shapeHistory(germanHistory),
      },
      progress: {
        english: {
          unlocked: progress.english.unlocked,
          packsCompleted: progress.english.packsCompleted,
          perfectPacks: progress.english.perfectPacks,
          lastPackScore: progress.english.lastPackScore,
          lastPackDate: progress.english.lastPackDate,
        },
        german: {
          unlocked: progress.german.unlocked,
          unlockedAt: progress.german.unlockedAt,
          packsCompleted: progress.german.packsCompleted,
          perfectPacks: progress.german.perfectPacks,
          lastPackScore: progress.german.lastPackScore,
          lastPackDate: progress.german.lastPackDate,
        },
      },
      pack: serializePack(pack),
    });
  } catch (error) {
    if (error.locked) {
      return reply.code(403).send({
        success: false,
        message:
          "Nemis tili hali ochilmagan — avval inglizchada 100% olishingiz kerak.",
        locked: true,
        needsPerfect: error.needsPerfect,
        progress,
      });
    }

    if (error.message === "NO_WORDS_AVAILABLE") {
      return reply.code(503).send({
        success: false,
        message: "Hali so'zlar yetarli emas. Admin bilan bog'laning.",
      });
    }

    request.log.error({ err: error }, "daily pack failed");
    return reply.code(500).send({
      success: false,
      message: "Daily pack creation failed",
    });
  }
}

/**
 * POST /api/v1/vocabulary/daily/answer
 */
export async function submitAnswer(request, reply) {
  const parsed = answerSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({
      success: false,
      message: "Invalid answer payload",
    });
  }

  const user = request.user;
  const userId = user._id ?? user.id;

  try {
    const result = await recordAnswer({
      userId,
      wordId: parsed.data.wordId,
      answer: parsed.data.answer,
      language: parsed.data.language,
      timezone: user.timezone,
    });

    return reply.send({ success: true, ...result });
  } catch (error) {
    if (
      error.message === "PACK_NOT_FOUND" ||
      error.message === "WORD_NOT_IN_PACK"
    ) {
      return reply.code(404).send({
        success: false,
        message: error.message,
      });
    }

    request.log.error({ err: error }, "answer failed");
    return reply.code(500).send({
      success: false,
      message: "Could not record answer",
    });
  }
}

/**
 * POST /api/v1/vocabulary/daily/complete
 * Finalises the pack and handles the language unlock.
 */
export async function completeDailyPack(request, reply) {
  const parsed = completeSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({
      success: false,
      message: "Invalid payload",
    });
  }

  const user = request.user;
  const userId = user._id ?? user.id;

  try {
    const result = await completePack({
      userId,
      language: parsed.data.language,
      timezone: user.timezone,
    });

    return reply.send({ success: true, ...result });
  } catch (error) {
    if (error.message === "PACK_NOT_FOUND") {
      return reply.code(404).send({
        success: false,
        message: "No pack to complete",
      });
    }

    request.log.error({ err: error }, "complete failed");
    return reply.code(500).send({
      success: false,
      message: "Could not complete pack",
    });
  }
}

/**
 * GET /api/v1/vocabulary/daily/options?language=…&wordId=…
 * Returns the correct translation plus 3 random distractors drawn from
 * other words in the same pack (so the Easy Mode UI can render MCQ
 * buttons without leaking all answers up front).
 */
export async function getOptions(request, reply) {
  const query = z
    .object({
      language: z.enum(["english", "german"]),
      wordId: z.string().min(1),
    })
    .safeParse(request.query);

  if (!query.success) {
    return reply.code(400).send({
      success: false,
      message: "Invalid query",
    });
  }

  const user = request.user;
  const userId = user._id ?? user.id;
  const date = todayDate(user.timezone);

  const DailyVocabulary = (await import("../models/DailyVocabulary.js"))
    .default;

  const pack = await DailyVocabulary.findOne({
    user: userId,
    date,
    language: query.data.language,
  });

  if (!pack) {
    return reply
      .code(404)
      .send({ success: false, message: "Pack not found" });
  }

  const current = pack.words.find(
    (w) => w.wordId.toString() === query.data.wordId,
  );

  if (!current) {
    return reply
      .code(404)
      .send({ success: false, message: "Word not in pack" });
  }

  const otherTranslations = pack.words
    .filter(
      (w) =>
        w.wordId.toString() !== query.data.wordId &&
        w.translationUz &&
        w.translationUz !== current.translationUz,
    )
    .map((w) => w.translationUz);

  // Pick 3 unique distractors
  const picked = new Set();
  while (picked.size < 3 && otherTranslations.length > 0) {
    const idx = Math.floor(Math.random() * otherTranslations.length);
    const next = otherTranslations.splice(idx, 1)[0];
    if (next) picked.add(next);
  }

  const options = [current.translationUz, ...picked].sort(
    () => Math.random() - 0.5,
  );

  return reply.send({
    success: true,
    wordId: query.data.wordId,
    options,
  });
}

/**
 * GET /api/v1/vocabulary/daily/progress
 */
export async function getProgress(request, reply) {
  const user = request.user;
  const userId = user._id ?? user.id;

  const progress = await ensureLanguageProgress(userId);

  return reply.send({
    success: true,
    english: progress.english,
    german: progress.german,
  });
}
