"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  RotateCcw,
} from "lucide-react";

import type { DailyTask } from "@/types/tasks";

export function TaskDetail({
  taskId,
}: {
  taskId: string;
}) {
  const [task, setTask] = useState<DailyTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    async function loadTask() {
      try {
        const response = await fetch(
          `/api/tasks/${taskId}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("Unable to load task");
        }

        const data = await response.json();

        setTask(data.task);
      } catch {
        setError("Failed to load exercise.");
      } finally {
        setLoading(false);
      }
    }

    void loadTask();
  }, [taskId]);

  async function setStatus(
    status: "pending" | "in_progress" | "completed",
  ) {
    if (!task || updating) return;

    setUpdating(true);
    setError("");

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Yangilab bo‘lmadi");
      }

      setTask(data.task);

      // When marking complete, also log a study session for analytics.
      if (status === "completed") {
        const minutes = Math.max(
          1,
          Math.min(
            task.estimatedMinutes || 10,
            Math.round((Date.now() - startedAt) / 60000) || 1,
          ),
        );

        void fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            language: task.language,
            activity: "task",
            referenceId: task.id,
            durationMinutes: minutes,
          }),
          keepalive: true,
        }).catch(() => {});
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Noma'lum xatolik",
      );
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-8 text-sm text-red-600">
        {error || "Task not found"}
      </div>
    );
  }

  const isDone = task.status === "completed";

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/dashboard/planner"
        className="mb-8 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-black"
      >
        <ArrowLeft size={16} />
        Back to Planner
      </Link>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <BookOpen size={15} />
            <span>{task.language === "german" ? "🇩🇪 German" : "🇬🇧 English"}</span>
            <span className="text-neutral-300">·</span>
            <span className="capitalize">
              {task.type.replace(/_/g, " ")}
            </span>
          </div>

          {isDone && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#d6ead4] bg-ok-bg px-2.5 py-1 text-[11px] font-medium text-ok">
              <CheckCircle2 size={11} />
              Bajarildi
            </span>
          )}
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          {task.title}
        </h1>

        <p className="mt-3 text-sm text-neutral-500">
          {task.instructions}
        </p>

        <div className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 p-5">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm text-neutral-800">
            {JSON.stringify(task.content, null, 2)}
          </pre>
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs text-neutral-400">
          <Clock3 size={13} />
          Estimated time: {task.estimatedMinutes} minutes
        </div>

        {error && (
          <p className="mt-4 text-xs text-red-600">
            {error}
          </p>
        )}

        {/* Action bar */}
        <div className="mt-8 flex flex-wrap items-center justify-end gap-2 border-t border-neutral-100 pt-5">
          {isDone ? (
            <button
              type="button"
              onClick={() => void setStatus("pending")}
              disabled={updating}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3.5 text-[12px] font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900 disabled:opacity-50"
            >
              {updating ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RotateCcw size={13} />
              )}
              Qayta ochish
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void setStatus("completed")}
              disabled={updating}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#333333] disabled:opacity-60"
            >
              {updating ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Check size={13} />
              )}
              Bajarildi deb belgilash
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
