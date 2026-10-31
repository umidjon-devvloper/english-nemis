import mongoose from "mongoose";

import DailyVocabulary from "../../models/DailyVocabulary.js";
import UserLanguageProgress from "../../models/UserLanguageProgress.js";
import UserVocabularyProgress from "../../models/UserVocabularyProgress.js";
import VocabularyWord from "../../models/VocabularyWord.js";
import StudySession from "../../models/StudySession.js";

export const PACK_SIZE = 100;
export const MIN_PACK_SIZE = 10;
export const MAX_PACK_SIZE = 300;
const PERFECT_THRESHOLD = 100; // require 100% to unlock next language

function clampPackSize(value) {
  const n = Number(value) || PACK_SIZE;
  return Math.min(MAX_PACK_SIZE, Math.max(MIN_PACK_SIZE, Math.round(n)));
}

export function todayDate(timezone = "Asia/Tashkent") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type) =>
    parts.find((p) => p.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function dateMinusDays(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * Ensure a user has a language-progress row for both English and German.
 * English is unlocked by default; German stays locked until the user
 * clears a perfect English pack.
 */
export async function ensureLanguageProgress(userId) {
  const [english, german] = await Promise.all([
    UserLanguageProgress.findOneAndUpdate(
      { user: userId, language: "english" },
      {
        $setOnInsert: {
          user: userId,
          language: "english",
          unlocked: true,
          unlockedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
    UserLanguageProgress.findOneAndUpdate(
      { user: userId, language: "german" },
      {
        $setOnInsert: {
          user: userId,
          language: "german",
          unlocked: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
  ]);

  return { english, german };
}

/**
 * Pick up to PACK_SIZE words for today's pack. Priority:
 *   1. Words the user got WRONG previously (review-first).
 *   2. Words the user has NEVER seen.
 *   3. Fallback: random words in the language.
 */
async function pickWordsForUser({ userId, language, size }) {
  const seen = await UserVocabularyProgress.find({ user: userId })
    .select("word status incorrectAnswers")
    .lean();

  const wrongWordIds = seen
    .filter((p) => p.incorrectAnswers > 0 && p.status !== "mastered")
    .map((p) => p.word);

  const seenWordIds = new Set(seen.map((p) => p.word.toString()));

  const picked = [];

  // 1. Wrong words first
  if (wrongWordIds.length > 0) {
    const wrong = await VocabularyWord.aggregate([
      {
        $match: {
          _id: { $in: wrongWordIds },
          language,
        },
      },
      { $sample: { size } },
    ]);

    picked.push(...wrong);
  }

  // 2. Unseen words
  if (picked.length < size) {
    const seenIds = [...seenWordIds].map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    const unseen = await VocabularyWord.aggregate([
      {
        $match: {
          language,
          _id: { $nin: seenIds },
        },
      },
      { $sample: { size: size - picked.length } },
    ]);

    picked.push(...unseen);
  }

  // 3. Fallback — any word in the language
  if (picked.length < size) {
    const anyMore = await VocabularyWord.aggregate([
      { $match: { language } },
      { $sample: { size: size - picked.length } },
    ]);

    const existing = new Set(picked.map((w) => w._id.toString()));
    for (const w of anyMore) {
      if (!existing.has(w._id.toString())) {
        picked.push(w);
        if (picked.length >= size) break;
      }
    }
  }

  return picked.slice(0, size);
}

/**
 * Pull or create today's pack for the user in the given language.
 * Checks the language gate first — German requires `unlocked: true`.
 */
export async function getOrCreateDailyPack({
  userId,
  language,
  timezone,
  packSize,
}) {
  const { english, german } = await ensureLanguageProgress(userId);

  const target = language === "english" ? english : german;

  if (!target.unlocked) {
    const err = new Error("LANGUAGE_LOCKED");
    err.locked = true;
    err.needsPerfect = PERFECT_THRESHOLD;
    throw err;
  }

  const date = todayDate(timezone);

  const existing = await DailyVocabulary.findOne({
    user: userId,
    date,
    language,
  });

  if (existing) return existing;

  const size = clampPackSize(packSize);

  const words = await pickWordsForUser({
    userId,
    language,
    size,
  });

  if (words.length === 0) {
    const err = new Error("NO_WORDS_AVAILABLE");
    err.language = language;
    throw err;
  }

  return DailyVocabulary.create({
    user: userId,
    date,
    language,
    size: words.length,
    words: words.map((w) => ({
      wordId: w._id,
      word: w.word,
      translationUz: w.translationUz,
      pronunciation: w.pronunciation,
      example: w.example,
    })),
  });
}

function normalize(value) {
  if (value == null) return "";
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[‘’ʼʻ`´']/g, "'")
    .replace(/\s+/g, " ");
}

function expandCandidates(raw) {
  const strings = [String(raw)];
  const split = String(raw)
    .split(/\s*[,/|]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (split.length > 1) strings.push(...split);

  const extra = [];
  for (const s of strings) {
    if (/^to\s+/i.test(s)) extra.push(s.replace(/^to\s+/i, ""));
    const noParen = s.replace(/\s*\([^)]*\)\s*/g, " ").trim();
    if (noParen && noParen !== s) extra.push(noParen);
  }

  return [...strings, ...extra];
}

export function isAnswerCorrect(expected, actual) {
  if (!expected) return false;
  const user = normalize(actual);
  if (!user) return false;

  const candidates = expandCandidates(expected).map(normalize);
  return candidates.some((c) => c === user);
}

/**
 * Record one answer. Updates:
 *   - the pack entry (answered / correct / userAnswer / attempts)
 *   - the UserVocabularyProgress row for that word (spaced-repetition-ish)
 * Returns {correct, correctAnswer, mastered, total}.
 */
export async function recordAnswer({
  userId,
  wordId,
  answer,
  timezone,
  language,
}) {
  const date = todayDate(timezone);

  const pack = await DailyVocabulary.findOne({
    user: userId,
    date,
    language,
  });

  if (!pack) {
    const err = new Error("PACK_NOT_FOUND");
    throw err;
  }

  const entry = pack.words.find(
    (w) => w.wordId.toString() === wordId,
  );

  if (!entry) {
    const err = new Error("WORD_NOT_IN_PACK");
    throw err;
  }

  if (entry.answered) {
    // Already recorded; return the previous result rather than scoring twice.
    const answered = pack.words.filter((w) => w.answered).length;
    return {
      correct: entry.correct,
      correctAnswer: entry.translationUz,
      answered,
      total: pack.words.length,
      alreadyAnswered: true,
    };
  }

  const correct = isAnswerCorrect(entry.translationUz, answer);

  entry.answered = true;
  entry.correct = correct;
  entry.userAnswer = String(answer).slice(0, 200);
  entry.attempts += 1;

  const answered = pack.words.filter((w) => w.answered).length;

  if (answered === pack.words.length) {
    pack.completed = true;
    pack.completedAt = new Date();
    pack.score = Math.round(
      (pack.words.filter((w) => w.correct).length /
        pack.words.length) *
        100,
    );
  }

  await pack.save();

  // Update long-term progress on this word
  const now = new Date();
  const update = correct
    ? {
        $inc: { correctAnswers: 1 },
        $set: {
          lastReviewedAt: now,
          status: "learning",
        },
      }
    : {
        $inc: { incorrectAnswers: 1 },
        $set: {
          lastReviewedAt: now,
          status: "learning",
        },
      };

  await UserVocabularyProgress.findOneAndUpdate(
    { user: userId, word: entry.wordId },
    { ...update, $setOnInsert: { user: userId, word: entry.wordId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return {
    correct,
    correctAnswer: entry.translationUz,
    answered,
    total: pack.words.length,
    completed: pack.completed,
    score: pack.score,
  };
}

/**
 * Finalize the pack even if the user quit early. Also handles the
 * language unlock: a 100%-score English pack flips German's gate.
 */
export async function completePack({ userId, language, timezone }) {
  const date = todayDate(timezone);

  const pack = await DailyVocabulary.findOne({
    user: userId,
    date,
    language,
  });

  if (!pack) {
    throw new Error("PACK_NOT_FOUND");
  }

  const answered = pack.words.filter((w) => w.answered).length;
  const correct = pack.words.filter((w) => w.correct).length;

  const wasAlreadyCompleted = pack.completed;

  if (!pack.completed) {
    pack.completed = true;
    pack.completedAt = new Date();
    pack.score = pack.words.length
      ? Math.round((correct / pack.words.length) * 100)
      : 0;
    await pack.save();
  }

  // Log one StudySession per pack so Analytics / streak reflects it.
  // Only on the first completion of this pack — avoids double-counting
  // when the user hits "complete" twice.
  if (!wasAlreadyCompleted) {
    // Rough estimate: 20 seconds per answered word, capped at 60 minutes.
    const minutes = Math.max(1, Math.min(60, Math.round((answered * 20) / 60)));

    await StudySession.create({
      user: userId,
      date,
      language,
      activity: "daily_pack",
      referenceId: pack._id,
      durationMinutes: minutes,
      correctAnswers: correct,
      totalAnswers: pack.words.length,
    });
  }

  // Update per-language progress — compute streak if this is the first
  // completion today.
  const existingProgress = await UserLanguageProgress.findOne({
    user: userId,
    language,
  });

  let nextStreak = existingProgress?.streakDays ?? 0;
  if (!wasAlreadyCompleted) {
    const yesterday = dateMinusDays(date, 1);
    const last = existingProgress?.lastPackDate;
    if (last === yesterday) nextStreak = (nextStreak || 0) + 1;
    else if (last === date) nextStreak = nextStreak || 1;
    else nextStreak = 1;
  }

  const progress = await UserLanguageProgress.findOneAndUpdate(
    { user: userId, language },
    {
      $inc: wasAlreadyCompleted
        ? {}
        : {
            packsCompleted: 1,
            perfectPacks: pack.score === PERFECT_THRESHOLD ? 1 : 0,
          },
      $set: {
        lastPackScore: pack.score,
        lastPackDate: date,
        streakDays: nextStreak,
      },
      $setOnInsert: {
        user: userId,
        language,
        unlocked: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // Unlock the next language on a perfect English pack.
  let unlockedLanguage = null;
  if (language === "english" && pack.score === PERFECT_THRESHOLD) {
    const german = await UserLanguageProgress.findOne({
      user: userId,
      language: "german",
    });

    if (german && !german.unlocked) {
      german.unlocked = true;
      german.unlockedAt = new Date();
      await german.save();
      unlockedLanguage = "german";
    }
  }

  return {
    answered,
    correct,
    total: pack.words.length,
    score: pack.score,
    completed: pack.completed,
    perfect: pack.score === PERFECT_THRESHOLD,
    unlockedLanguage,
    progress,
  };
}
