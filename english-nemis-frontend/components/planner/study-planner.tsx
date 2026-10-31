"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

type Task = {
  id: string;
  language: "english" | "german";
  type: string;
  title: string;
  instructions: string;
  estimatedMinutes: number;
  status: "pending" | "in_progress" | "completed";
  order: number;
};

type Plan = {
  id: string;
  englishTargetMinutes: number;
  germanTargetMinutes: number;
  status: string;
};

type TodayResponse = {
  success: boolean;
  date: string;
  plan: Plan | null;
  tasks: Task[];
  stats: {
    total: number;
    completed: number;
    pending: number;
  };
};

export function StudyPlanner() {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTasks() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tasks/today", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const result: TodayResponse = await response.json();

      setData(result);
    } catch {
      setError("Unable to load today's study plan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">{error}</p>

          <button
            onClick={loadTasks}
            className="mt-4 rounded-md bg-black px-4 py-2 text-xs text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const total = data.stats.total;
  const completed = data.stats.completed;

  const progress = total
    ? Math.round((completed / total) * 100)
    : 0;

  const languages = [
    {
      id: "english" as const,
      name: "English",
      flag: "🇬🇧",
      target: data.plan?.englishTargetMinutes ?? 150,
    },
    {
      id: "german" as const,
      name: "German",
      flag: "🇩🇪",
      target: data.plan?.germanTargetMinutes ?? 120,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 md:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
            <CalendarDays size={14} />
            {data.date}
          </div>

          <h1 className="text-[28px] font-semibold tracking-tight">
            Study Planner
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            Your personalized daily learning plan.
          </p>
        </div>

        <button
          onClick={loadTasks}
          className="flex h-9 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 text-xs font-medium hover:bg-neutral-50"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Daily Progress */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              Daily Progress
            </h2>

            <p className="mt-1 text-xs text-neutral-500">
              {completed} of {total} tasks completed
            </p>
          </div>

          <span className="text-2xl font-semibold">
            {progress}%
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-black transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Language Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {languages.map((language) => {
          const tasks = data.tasks.filter(
            (task) => task.language === language.id,
          );

          const completedCount = tasks.filter(
            (task) => task.status === "completed",
          ).length;

          return (
            <section
              key={language.id}
              className="overflow-hidden rounded-lg border border-neutral-200 bg-white"
            >
              <div className="border-b border-neutral-100 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {language.flag}
                    </span>

                    <div>
                      <h2 className="text-base font-semibold">
                        {language.name}
                      </h2>

                      <p className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
                        <Clock3 size={12} />
                        Daily goal: {language.target} min
                      </p>
                    </div>
                  </div>

                  <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-600">
                    {completedCount}/{tasks.length}
                  </span>
                </div>
              </div>

              <div className="space-y-3 p-5">
                {tasks.length === 0 ? (
                  <div className="py-10 text-center">
                    <Sparkles
                      size={24}
                      className="mx-auto mb-3 text-neutral-300"
                    />

                    <p className="text-sm font-medium">
                      No tasks generated yet
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      Your AI exercises will appear here.
                    </p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/dashboard/planner/tasks/${task.id}`}
                      className="group flex items-start gap-3 rounded-lg border border-neutral-200 p-4 transition-colors hover:bg-neutral-50"
                    >
                      <div className="pt-0.5">
                        {task.status === "completed" ? (
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
                        <p className="text-sm font-medium">
                          {task.title}
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          {task.type.replaceAll("_", " ")}
                        </p>

                        <p className="mt-2 flex items-center gap-1 text-xs text-neutral-400">
                          <Clock3 size={12} />
                          {task.estimatedMinutes} min
                        </p>
                      </div>

                      <ArrowUpRight
                        size={16}
                        className="text-neutral-400 group-hover:text-black"
                      />
                    </Link>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Empty Plan */}
      {!data.plan && (
        <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-6">
          <div className="flex items-start gap-3">
            <BookOpen
              size={18}
              className="mt-0.5 text-neutral-500"
            />

            <div>
              <h3 className="text-sm font-medium">
                Daily plan not generated
              </h3>

              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Your daily learning plan has not been
                generated yet. Once the AI scheduler
                creates your exercises, they will appear
                automatically after refreshing this page.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}