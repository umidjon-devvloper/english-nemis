import mongoose from "mongoose";
import { z } from "zod";

import VocabularyBook from "../models/VocabularyBook.js";
import VocabularyUnit from "../models/VocabularyUnit.js";
import VocabularyWord from "../models/VocabularyWord.js";
import VocabularyExercise from "../models/VocabularyExercise.js";
import VocabularyReading from "../models/VocabularyReading.js";
import VocabularyAttempt from "../models/VocabularyAttempt.js";
import StudySession from "../models/StudySession.js";

// Unicode apostrophe variants used across Uzbek/English/German text.
// All of these should be treated as equivalent so a learner typing
// "bo'lmoq" (ASCII apostrophe) matches a seeded "bo‘lmoq" (curly).
const APOSTROPHE_CLASS = /['‘’ʼʻ`´]/g;

function normalize(value) {
  if (value == null) return "";
  return String(value)
    .trim()
    .toLowerCase()
    .replace(APOSTROPHE_CLASS, "'")
    .replace(/\s+/g, " ");
}

// Build an expanded set of accepted answers from a seeded value:
//  - the original string
//  - each comma- or slash-separated alternative
//  - a form with leading "to " dropped (English infinitives)
//  - a form with surrounding parentheses stripped
function expandCandidates(raw) {
  const strings = [String(raw)];

  // Split "to be, exist" or "run / jog" into alternatives
  const split = String(raw)
    .split(/\s*[,/|]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (split.length > 1) strings.push(...split);

  const extra = [];
  for (const s of strings) {
    // Drop English infinitive marker
    if (/^to\s+/i.test(s)) extra.push(s.replace(/^to\s+/i, ""));

    // Strip parentheses: "run (jog)" -> "run"
    const noParen = s.replace(/\s*\([^)]*\)\s*/g, " ").trim();
    if (noParen && noParen !== s) extra.push(noParen);
  }

  return [...strings, ...extra];
}

function isCorrectAnswer(exercise, userAnswer) {
  const key = exercise.answerKey;
  if (!key || userAnswer == null) return false;

  const user = normalize(userAnswer);
  if (!user) return false;

  const raws = [];

  if (typeof key === "string" || typeof key === "number") {
    raws.push(key);
  } else if (Array.isArray(key)) {
    raws.push(...key);
  } else if (typeof key === "object") {
    if (key.correctAnswer != null) raws.push(key.correctAnswer);
    if (Array.isArray(key.correctAnswers)) {
      raws.push(...key.correctAnswers);
    }
    if (Array.isArray(key.acceptable)) {
      raws.push(...key.acceptable);
    }
  }

  const expanded = raws.flatMap(expandCandidates);

  return expanded.map(normalize).some((c) => c === user);
}

function localDate(timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone || "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type) =>
    parts.find((part) => part.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}`;
}

const submitSchema = z.object({
  answers: z
    .array(
      z.object({
        exerciseId: z.string(),
        answer: z.string().max(1000),
      }),
    )
    .min(1)
    .max(50),
  durationSeconds: z.number().min(0).max(7200).optional(),
});

const readingQuizSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        answer: z.string().max(1000),
      }),
    )
    .min(1)
    .max(20),
  durationSeconds: z.number().min(0).max(7200).optional(),
});

export async function getVocabularyBooks(request, reply) {
  const { language } = request.query;

  if (language && !["english", "german"].includes(language)) {
    return reply.code(400).send({
      success: false,
      message: "Invalid language",
    });
  }

  const filter = language ? { language } : {};

  const books = await VocabularyBook.find(filter)
    .sort({ order: 1 })
    .lean();

  return {
    success: true,
    books,
  };
}

export async function getVocabularyUnits(request, reply) {
  const { bookId } = request.params;

  if (!mongoose.isValidObjectId(bookId)) {
    return reply.code(400).send({
      success: false,
      message: "Invalid book ID",
    });
  }

  const book = await VocabularyBook.findById(bookId).lean();

  if (!book) {
    return reply.code(404).send({
      success: false,
      message: "Book not found",
    });
  }

  const units = await VocabularyUnit.find({
    book: bookId,
  })
    .sort({ unitNumber: 1 })
    .lean();

  return {
    success: true,
    book,
    units,
  };
}

export async function getVocabularyUnitDetail(request, reply) {
  const { unitId } = request.params;

  if (!mongoose.isValidObjectId(unitId)) {
    return reply.code(400).send({
      success: false,
      message: "Invalid unit ID",
    });
  }

  const unit = await VocabularyUnit.findById(unitId).lean();

  if (!unit) {
    return reply.code(404).send({
      success: false,
      message: "Unit not found",
    });
  }

  const [words, exercises, reading] = await Promise.all([
    VocabularyWord.find({ unit: unitId })
      .sort({ order: 1 })
      .lean(),

    VocabularyExercise.find({ unit: unitId })
      .sort({ order: 1 })
      .lean(),

    VocabularyReading.findOne({ unit: unitId }).lean(),
  ]);

  // Reading savollarining javoblari frontendga chiqmasin.
  const safeReading = reading
    ? {
        ...reading,
        questions: reading.questions.map((question) => ({
          _id: question._id,
          question: question.question,
          options: question.options,
        })),
      }
    : null;

  return {
    success: true,
    unit,
    words,
    exercises,
    reading: safeReading,
  };
}

export async function submitUnitQuiz(request, reply) {
  const { unitId } = request.params;

  if (!mongoose.isValidObjectId(unitId)) {
    return reply.code(400).send({
      success: false,
      message: "Invalid unit ID",
    });
  }

  const parsed = submitSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.code(400).send({
      success: false,
      message: "Invalid quiz payload",
      errors: z.flattenError(parsed.error),
    });
  }

  const unit = await VocabularyUnit.findById(unitId)
    .populate("book", "language")
    .lean();

  if (!unit) {
    return reply.code(404).send({
      success: false,
      message: "Unit not found",
    });
  }

  const language = unit.book?.language ?? "english";

  const exerciseIds = parsed.data.answers
    .map((a) => a.exerciseId)
    .filter((id) => mongoose.isValidObjectId(id));

  // Pull answerKey + explanation (both are select:false by default).
  const exercises = await VocabularyExercise.find({
    unit: unitId,
    _id: { $in: exerciseIds },
  })
    .select("+answerKey +explanationUz")
    .lean();

  const exerciseMap = new Map(
    exercises.map((ex) => [ex._id.toString(), ex]),
  );

  const results = parsed.data.answers.map(({ exerciseId, answer }) => {
    const ex = exerciseMap.get(exerciseId);

    if (!ex) {
      return {
        exerciseId,
        userAnswer: answer,
        correct: false,
        correctAnswer: null,
        explanationUz: "",
        skipped: true,
      };
    }

    const correct = isCorrectAnswer(ex, answer);

    return {
      exerciseId,
      userAnswer: answer,
      correct,
      correctAnswer:
        typeof ex.answerKey === "object" &&
        ex.answerKey?.correctAnswer != null
          ? ex.answerKey.correctAnswer
          : ex.answerKey,
      explanationUz: ex.explanationUz || "",
      skipped: false,
    };
  });

  const correctCount = results.filter((r) => r.correct).length;
  const total = results.length;
  const score = total ? Math.round((correctCount / total) * 100) : 0;

  const user = request.user;
  const userId = user._id ?? user.id;

  await VocabularyAttempt.create({
    user: userId,
    unit: unitId,
    language,
    total,
    correct: correctCount,
    answers: results.map((r) => ({
      exerciseId: new mongoose.Types.ObjectId(r.exerciseId),
      userAnswer: r.userAnswer,
      correct: r.correct,
    })),
    durationSeconds: parsed.data.durationSeconds ?? 0,
  });

  // Also log a StudySession so Analytics reflects quiz activity.
  const minutes = Math.max(
    1,
    Math.round((parsed.data.durationSeconds ?? total * 60) / 60),
  );

  await StudySession.create({
    user: userId,
    date: localDate(user.timezone),
    language,
    activity: "vocabulary",
    referenceId: new mongoose.Types.ObjectId(unitId),
    durationMinutes: Math.min(minutes, 60),
    correctAnswers: correctCount,
    totalAnswers: total,
  });

  return reply.send({
    success: true,
    score,
    correct: correctCount,
    total,
    results,
  });
}

export async function submitReadingQuiz(request, reply) {
  const { unitId } = request.params;

  if (!mongoose.isValidObjectId(unitId)) {
    return reply.code(400).send({
      success: false,
      message: "Invalid unit ID",
    });
  }

  const parsed = readingQuizSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.code(400).send({
      success: false,
      message: "Invalid reading quiz payload",
      errors: z.flattenError(parsed.error),
    });
  }

  const unit = await VocabularyUnit.findById(unitId)
    .populate("book", "language")
    .lean();

  if (!unit) {
    return reply.code(404).send({
      success: false,
      message: "Unit not found",
    });
  }

  const language = unit.book?.language ?? "english";

  // Pull reading with answerKey (select:false by default).
  const reading = await VocabularyReading.findOne({ unit: unitId })
    .select("+questions.answerKey")
    .lean();

  if (!reading) {
    return reply.code(404).send({
      success: false,
      message: "Reading not found for this unit",
    });
  }

  const questionMap = new Map(
    reading.questions.map((q) => [q._id.toString(), q]),
  );

  const results = parsed.data.answers.map(({ questionId, answer }) => {
    const q = questionMap.get(questionId);

    if (!q) {
      return {
        questionId,
        userAnswer: answer,
        correct: false,
        correctAnswer: null,
        skipped: true,
      };
    }

    const correct = isCorrectAnswer({ answerKey: q.answerKey }, answer);

    return {
      questionId,
      userAnswer: answer,
      correct,
      correctAnswer:
        typeof q.answerKey === "object" &&
        q.answerKey?.correctAnswer != null
          ? q.answerKey.correctAnswer
          : q.answerKey,
      skipped: false,
    };
  });

  const correctCount = results.filter((r) => r.correct).length;
  const total = results.length;
  const score = total ? Math.round((correctCount / total) * 100) : 0;

  const user = request.user;
  const userId = user._id ?? user.id;

  // Log a short reading session
  const minutes = Math.max(
    1,
    Math.round((parsed.data.durationSeconds ?? total * 90) / 60),
  );

  await StudySession.create({
    user: userId,
    date: localDate(user.timezone),
    language,
    activity: "reading",
    referenceId: new mongoose.Types.ObjectId(unitId),
    durationMinutes: Math.min(minutes, 30),
    correctAnswers: correctCount,
    totalAnswers: total,
  });

  return reply.send({
    success: true,
    score,
    correct: correctCount,
    total,
    results,
  });
}