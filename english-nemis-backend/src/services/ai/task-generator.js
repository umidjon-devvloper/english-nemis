import mongoose from "mongoose";

import User from "../../models/User.js";
import AiConfig from "../../models/AiConfig.js";
import DailyPlan from "../../models/DailyPlan.js";
import DailyTask from "../../models/DailyTask.js";

import { generateWithFallback } from "./ai-router.js";

const EXERCISE_TYPES = [
  "fill_blank",
  "multiple_choice",
  "translation",
  "sentence_building",
  "grammar_correction",
  "reading",
  "writing",
];

const taskSchemaDescription = `
Return a JSON object with this structure:

{
  "exercises": [
    {
      "type": "fill_blank",
      "title": "Complete the sentence",
      "instructions": "Choose the correct word.",
      "content": {
        "sentence": "I want to ____ my English.",
        "wordBank": ["improve", "forget", "lose"]
      },
      "answerKey": {
        "correctAnswer": "improve"
      },
      "explanation": "Improve means to make something better.",
      "estimatedMinutes": 10
    }
  ]
}

Rules:
- Return JSON only.
- "content" must always be an object.
- "answerKey" must always be an object.
- "type" must match an allowed exercise type.
- Multiple choice questions must include options.
- Fill-in-the-blank questions must include a word bank.
- Every question must have a correct answer.
- Provide clear explanations.
- Do not include markdown code fences.
`;

function getDateInTimezone(timezone = "Asia/Tashkent") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function buildPrompt({
  language,
  level,
  count,
  exerciseTypes,
  date,
}) {
  return `
You are LinguaCoach AI, a professional language tutor.

Create ${count} exercises for a student.

Language: ${language}
Student level: ${level}
Date: ${date}

Allowed exercise types:
${exerciseTypes.join(", ")}

Requirements:
1. Match the student's language level.
2. Include practical everyday vocabulary.
3. Include grammar and sentence-building practice.
4. Use clear instructions.
5. Avoid duplicate questions.
6. Make exercises suitable for self-study.
7. Include answer keys and explanations.
8. Return exactly ${count} exercises.

${taskSchemaDescription}
`;
}

function validateExercises(exercises, allowedTypes, expectedCount) {
  if (!Array.isArray(exercises)) {
    throw new Error("AI_EXERCISES_NOT_ARRAY");
  }

  if (exercises.length !== expectedCount) {
    throw new Error("AI_EXERCISE_COUNT_MISMATCH");
  }

  for (const exercise of exercises) {
    if (!allowedTypes.includes(exercise.type)) {
      throw new Error(`INVALID_EXERCISE_TYPE: ${exercise.type}`);
    }

    if (
      typeof exercise.title !== "string" ||
      !exercise.title.trim()
    ) {
      throw new Error("INVALID_EXERCISE_TITLE");
    }

    if (
      !exercise.content ||
      typeof exercise.content !== "object" ||
      Array.isArray(exercise.content)
    ) {
      throw new Error("INVALID_EXERCISE_CONTENT");
    }

    if (
      !exercise.answerKey ||
      typeof exercise.answerKey !== "object" ||
      Array.isArray(exercise.answerKey)
    ) {
      throw new Error("INVALID_EXERCISE_ANSWER_KEY");
    }
  }

  return exercises;
}

async function generateLanguageTasks({
  user,
  plan,
  date,
  language,
  settings,
  config,
}) {
  const count = settings.exercisesPerDay;

  const allowedTypes = config.exerciseTypes.filter((type) =>
    EXERCISE_TYPES.includes(type),
  );

  if (!allowedTypes.length) {
    throw new Error("NO_VALID_EXERCISE_TYPES");
  }

  const prompt = buildPrompt({
    language,
    level: settings.level,
    count,
    exerciseTypes: allowedTypes,
    date,
  });

  const result = await generateWithFallback(prompt);

  const exercises = validateExercises(
    result.data.exercises,
    allowedTypes,
    count,
  );

  const estimatedMinutes = Math.max(
    1,
    Math.floor(settings.dailyMinutes / count),
  );

  return exercises.map((exercise, index) => ({
    user: user._id,
    plan: plan._id,
    date,
    language,
    type: exercise.type,
    title: exercise.title.trim(),
    instructions: exercise.instructions || "",
    content: exercise.content,
    answerKey: exercise.answerKey,
    explanation: exercise.explanation || "",
    estimatedMinutes:
      Number.isFinite(exercise.estimatedMinutes) &&
      exercise.estimatedMinutes > 0
        ? exercise.estimatedMinutes
        : estimatedMinutes,
    order: index + 1,
    status: "pending",
  }));
}

export async function generateDailyTasksForUser(
  user,
  date,
  config,
) {
  const plan = await DailyPlan.findOneAndUpdate(
    {
      user: user._id,
      date,
    },
    {
      $setOnInsert: {
        user: user._id,
        date,
        timezone: config.timezone,
        englishTargetMinutes: config.english.dailyMinutes,
        germanTargetMinutes: config.german.dailyMinutes,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  const languages = [
    {
      name: "english",
      settings: config.english,
    },
    {
      name: "german",
      settings: config.german,
    },
  ];

  const results = [];

  for (const language of languages) {
    const existingCount = await DailyTask.countDocuments({
      user: user._id,
      date,
      language: language.name,
    });

    if (existingCount > 0) {
      results.push({
        language: language.name,
        status: "already_exists",
        count: existingCount,
      });

      continue;
    }

    const tasks = await generateLanguageTasks({
      user,
      plan,
      date,
      language: language.name,
      settings: language.settings,
      config,
    });

    await DailyTask.insertMany(tasks, {
      ordered: true,
    });

    results.push({
      language: language.name,
      status: "generated",
      count: tasks.length,
    });
  }

  await DailyPlan.updateOne(
    { _id: plan._id },
    {
      $set: {
        generatedAt: new Date(),
      },
    },
  );

  return {
    userId: user._id.toString(),
    date,
    results,
  };
}

export async function generateDailyTasksForAllUsers() {
  const config = await AiConfig.findOne({
    key: "global",
  });

  if (!config) {
    throw new Error("AI_CONFIG_NOT_FOUND");
  }

  if (!config.autoGenerate) {
    return {
      success: true,
      skipped: true,
      reason: "AUTO_GENERATION_DISABLED",
    };
  }

  const date = getDateInTimezone(config.timezone);

  const users = User.find({}).cursor();

  const results = [];

  for await (const user of users) {
    try {
      const result = await generateDailyTasksForUser(
        user,
        date,
        config,
      );

      results.push({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error(
        `Task generation failed for user ${user._id}:`,
        error.message,
      );

      results.push({
        success: false,
        userId: user._id.toString(),
        error: error.message,
      });
    }
  }

  return {
    success: true,
    date,
    totalUsers: results.length,
    generated: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
    results,
  };
}