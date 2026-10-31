"use client";

import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  BookOpen,
  BrainCircuit,
  Languages,
} from "lucide-react";

import Link from "next/link";

import type { DailyTask } from "@/types/tasks";

const typeLabels: Record<DailyTask["type"], string> = {
  fill_blank: "Fill in the blanks",
  multiple_choice: "Multiple choice",
  translation: "Translation",
  sentence_building: "Sentence building",
  grammar_correction: "Grammar correction",
  reading: "Reading",
  writing: "Writing",
};

export function TaskCard({
  task,
}: {
  task: DailyTask;
}) {
  const completed = task.status === "completed";

  return (
    <Link
      href={`/dashboard/planner/tasks/${task.id}`}
      className="group flex items-start gap-3 rounded-lg border border-neutral-200 p-4 transition-colors hover:bg-neutral-50"
    >
      <div className="pt-0.5">
        {completed ? (
          <CheckCircle2
            size={18}
            className="text-green-600"
          />
        ) : (
          <Circle
            size={18}
            className="text-neutral-300"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900">
          {task.title}
        </p>

        <p className="mt-1 text-xs text-neutral-500">
          {typeLabels[task.type]}
        </p>

        <p className="mt-2 text-xs text-neutral-400">
          {task.estimatedMinutes} min
        </p>
      </div>

      <ArrowUpRight
        size={16}
        className="text-neutral-400 group-hover:text-black"
      />
    </Link>
  );
}