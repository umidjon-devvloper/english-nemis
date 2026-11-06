import mongoose from "mongoose";
import { z } from "zod";

import ListeningClip from "../models/ListeningClip.js";
import StudySession from "../models/StudySession.js";

const listQuery = z.object({
  language: z.enum(["english", "german"]).optional(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
});

function localDate(timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone || "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type) =>
    parts.find((p) => p.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function listListeningClips(request, reply) {
  const parsed = listQuery.safeParse(request.query);
  if (!parsed.success) {
    return reply
      .code(400)
      .send({ success: false, message: "Invalid query" });
  }

  const filter = { published: true };
  if (parsed.data.language) filter.language = parsed.data.language;
  if (parsed.data.level) filter.level = parsed.data.level;

  const clips = await ListeningClip.find(filter)
    .sort({ level: 1, createdAt: -1 })
    .limit(50)
    .lean();

  // Strip answerKey from questions sent to the client — grading happens on submit.
  return reply.send({
    success: true,
    clips: clips.map((c) => ({
      id: c._id.toString(),
      language: c.language,
      level: c.level,
      title: c.title,
      transcript: c.transcript,
      translationUz: c.translationUz,
      durationSec: c.durationSec,
      audioUrl: c.audioUrl,
      kind: c.kind,
      source: c.source,
      questions: c.questions.map((q) => ({
        id: q._id.toString(),
        prompt: q.prompt,
        options: q.options,
      })),
    })),
  });
}

const submitSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        answer: z.string().max(500),
      }),
    )
    .min(1)
    .max(20),
});

export async function submitListeningAnswers(request, reply) {
  const { id } = request.params;

  if (!mongoose.isValidObjectId(id)) {
    return reply
      .code(400)
      .send({ success: false, message: "Invalid clip id" });
  }

  const parsed = submitSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply
      .code(400)
      .send({ success: false, message: "Invalid payload" });
  }

  const clip = await ListeningClip.findById(id);
  if (!clip) {
    return reply
      .code(404)
      .send({ success: false, message: "Clip not found" });
  }

  const qmap = new Map(
    clip.questions.map((q) => [q._id.toString(), q]),
  );

  const results = parsed.data.answers.map(({ questionId, answer }) => {
    const q = qmap.get(questionId);
    if (!q) {
      return {
        questionId,
        correct: false,
        correctAnswer: null,
        skipped: true,
      };
    }

    const correct =
      q.answer.trim().toLowerCase() === answer.trim().toLowerCase();

    return {
      questionId,
      correct,
      correctAnswer: q.answer,
      explanationUz: q.explanationUz,
    };
  });

  const correct = results.filter((r) => r.correct).length;
  const total = results.length;
  const score = total ? Math.round((correct / total) * 100) : 0;

  const user = request.user;
  await StudySession.create({
    user: user._id ?? user.id,
    date: localDate(user.timezone),
    language: clip.language,
    activity: "listening",
    referenceId: clip._id,
    durationMinutes: Math.max(
      1,
      Math.round((clip.durationSec || 180) / 60),
    ),
    correctAnswers: correct,
    totalAnswers: total,
  });

  return reply.send({
    success: true,
    correct,
    total,
    score,
    results,
  });
}
