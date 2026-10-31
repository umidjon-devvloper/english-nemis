import mongoose from "mongoose";
import { z } from "zod";

import DailyPlan from "../models/DailyPlan.js";
import DailyTask from "../models/DailyTask.js";

function getTodayDate(timezone) {
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

function serializeTask(task) {
  return {
    id: task._id.toString(),
    language: task.language,
    type: task.type,
    title: task.title,
    instructions: task.instructions,
    content: task.content,
    estimatedMinutes: task.estimatedMinutes,
    status: task.status,
    order: task.order,
    completedAt: task.completedAt,
  };
}

export async function getTodayTasks(request, reply) {
  try {
    const userId = request.user.id ?? request.user._id;
    const date = getTodayDate(request.user.timezone);

    const [plan, tasks] = await Promise.all([
      DailyPlan.findOne({
        user: userId,
        date,
      }).lean(),

      DailyTask.find({
        user: userId,
        date,
      })
        .sort({
          language: 1,
          order: 1,
        })
        .lean(),
    ]);

    return reply.send({
      success: true,
      date,

      plan: plan
        ? {
            id: plan._id.toString(),
            englishTargetMinutes:
              plan.englishTargetMinutes,
            germanTargetMinutes:
              plan.germanTargetMinutes,
            status: plan.status,
          }
        : null,

      tasks: tasks.map(serializeTask),

      stats: {
        total: tasks.length,
        completed: tasks.filter(
          (task) => task.status === "completed",
        ).length,
        pending: tasks.filter(
          (task) => task.status === "pending",
        ).length,
      },
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(500).send({
      success: false,
      message: "Failed to load today's tasks",
    });
  }
}

export async function getTaskById(request, reply) {
  const { id } = request.params;

  if (!mongoose.isValidObjectId(id)) {
    return reply.code(400).send({
      success: false,
      message: "Invalid task ID",
    });
  }

  const task = await DailyTask.findOne({
    _id: id,
    user: request.user.id ?? request.user._id,
  }).lean();

  if (!task) {
    return reply.code(404).send({
      success: false,
      message: "Task not found",
    });
  }

  return reply.send({
    success: true,
    task: serializeTask(task),
  });
}

const updateTaskSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed"]),
});

export async function updateTaskStatus(request, reply) {
  const { id } = request.params;

  if (!mongoose.isValidObjectId(id)) {
    return reply.code(400).send({
      success: false,
      message: "Invalid task ID",
    });
  }

  const parsed = updateTaskSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.code(400).send({
      success: false,
      message: "Invalid status",
    });
  }

  const update = { status: parsed.data.status };

  if (parsed.data.status === "completed") {
    update.completedAt = new Date();
  } else if (parsed.data.status === "pending") {
    update.completedAt = null;
  }

  const task = await DailyTask.findOneAndUpdate(
    {
      _id: id,
      user: request.user.id ?? request.user._id,
    },
    { $set: update },
    { new: true },
  ).lean();

  if (!task) {
    return reply.code(404).send({
      success: false,
      message: "Task not found",
    });
  }

  return reply.send({
    success: true,
    task: serializeTask(task),
  });
}
