import { z } from "zod";
import mongoose from "mongoose";

import StudySession from "../models/StudySession.js";
import DailyTask from "../models/DailyTask.js";

const recordSchema = z.object({
  language: z.enum(["english", "german"]),
  activity: z.string().trim().min(1).max(32),
  referenceId: z.string().optional(),
  durationMinutes: z.number().min(0).max(600),
  correctAnswers: z.number().int().min(0).optional(),
  totalAnswers: z.number().int().min(0).optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
});

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

function dateDaysAgo(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - days);

  return date.toISOString().slice(0, 10);
}

export async function recordSession(request, reply) {
  const parsed = recordSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.code(400).send({
      success: false,
      message: "Invalid session data",
      errors: z.flattenError(parsed.error),
    });
  }

  const user = request.user;
  const date = localDate(user.timezone);

  const session = await StudySession.create({
    user: user._id ?? user.id,
    date,
    language: parsed.data.language,
    activity: parsed.data.activity,
    referenceId: parsed.data.referenceId
      ? new mongoose.Types.ObjectId(parsed.data.referenceId)
      : null,
    durationMinutes: parsed.data.durationMinutes,
    correctAnswers: parsed.data.correctAnswers ?? null,
    totalAnswers: parsed.data.totalAnswers ?? null,
    startedAt: parsed.data.startedAt
      ? new Date(parsed.data.startedAt)
      : new Date(),
    endedAt: parsed.data.endedAt
      ? new Date(parsed.data.endedAt)
      : new Date(),
  });

  return reply.code(201).send({
    success: true,
    session: {
      id: session._id.toString(),
      date: session.date,
      durationMinutes: session.durationMinutes,
    },
  });
}

/**
 * Returns aggregated stats across BOTH StudySession records AND
 * completed DailyTasks for the last N days.
 */
export async function getStats(request, reply) {
  const user = request.user;
  const userId = user._id ?? user.id;
  const today = localDate(user.timezone);

  const requested = Number(request.query?.days) || 7;
  const days = Math.min(Math.max(requested, 1), 30);

  const fromDate = dateDaysAgo(today, days - 1);

  // Build date range
  const dateList = [];
  for (let i = days - 1; i >= 0; i--) {
    dateList.push(dateDaysAgo(today, i));
  }

  const [sessions, completedTasks] = await Promise.all([
    StudySession.find({
      user: userId,
      date: { $gte: fromDate, $lte: today },
    }).lean(),

    DailyTask.find({
      user: userId,
      date: { $gte: fromDate, $lte: today },
      status: "completed",
    })
      .select("date language type estimatedMinutes")
      .lean(),
  ]);

  // Aggregate by day + language
  const byDay = Object.fromEntries(
    dateList.map((d) => [d, { date: d, english: 0, german: 0 }]),
  );

  const byActivity = {};
  const byLanguage = { english: 0, german: 0 };
  let totalMinutes = 0;
  let correctAnswers = 0;
  let totalAnswers = 0;

  for (const task of completedTasks) {
    const bucket = byDay[task.date];
    if (bucket) {
      bucket[task.language] += task.estimatedMinutes || 0;
    }

    byLanguage[task.language] += task.estimatedMinutes || 0;
    totalMinutes += task.estimatedMinutes || 0;

    const key = task.type;
    byActivity[key] = (byActivity[key] || 0) + (task.estimatedMinutes || 0);
  }

  for (const session of sessions) {
    const bucket = byDay[session.date];
    if (bucket) {
      bucket[session.language] += session.durationMinutes;
    }

    byLanguage[session.language] += session.durationMinutes;
    totalMinutes += session.durationMinutes;

    const key = session.activity;
    byActivity[key] = (byActivity[key] || 0) + session.durationMinutes;

    if (session.correctAnswers != null && session.totalAnswers) {
      correctAnswers += session.correctAnswers;
      totalAnswers += session.totalAnswers;
    }
  }

  return reply.send({
    success: true,
    range: { from: fromDate, to: today, days },
    totalMinutes,
    byLanguage,
    byActivity,
    byDay: Object.values(byDay),
    accuracy:
      totalAnswers > 0
        ? Math.round((correctAnswers / totalAnswers) * 100)
        : null,
    sessionsRecorded: sessions.length,
    tasksCompleted: completedTasks.length,
  });
}

/**
 * Current streak = consecutive days (including today) with any
 * study activity (StudySession or completed DailyTask).
 */
export async function getStreak(request, reply) {
  const user = request.user;
  const userId = user._id ?? user.id;
  const today = localDate(user.timezone);

  // Look back max 60 days
  const WINDOW = 60;
  const fromDate = dateDaysAgo(today, WINDOW);

  const [sessionDates, taskDates] = await Promise.all([
    StudySession.distinct("date", {
      user: userId,
      date: { $gte: fromDate, $lte: today },
    }),

    DailyTask.distinct("date", {
      user: userId,
      date: { $gte: fromDate, $lte: today },
      status: "completed",
    }),
  ]);

  const activeDays = new Set([...sessionDates, ...taskDates]);

  let streak = 0;
  let cursor = today;
  const todaysActivity = activeDays.has(today);

  // If today has no activity, start counting from yesterday (so an
  // early-morning check still shows yesterday's streak).
  if (!todaysActivity) {
    cursor = dateDaysAgo(today, 1);
  }

  while (activeDays.has(cursor) && streak < WINDOW) {
    streak += 1;
    cursor = dateDaysAgo(cursor, 1);
  }

  return reply.send({
    success: true,
    currentStreak: streak,
    activeToday: todaysActivity,
    activeDaysInWindow: activeDays.size,
    windowDays: WINDOW,
  });
}
