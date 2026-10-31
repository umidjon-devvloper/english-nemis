"use client";

import { useCallback, useEffect, useState } from "react";

type TelegramProfile = {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  telegramId: string;
  notificationsEnabled: boolean;
  reminderHours: number[];
  connectedAt: string;
};

type TelegramStatus = {
  success: boolean;
  connected: boolean;
  telegram: TelegramProfile | null;
};

export default function TelegramConnect() {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      setError("");

      const response = await fetch("/api/telegram/status", {
        cache: "no-store",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load status");
      }

      setStatus(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // Telegramdan qaytganda statusni yangilash
  useEffect(() => {
    const refresh = () => {
      void loadStatus();
    };

    window.addEventListener("focus", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
    };
  }, [loadStatus]);

  async function connectTelegram() {
    try {
      setConnecting(true);
      setError("");

      const response = await fetch("/api/telegram/connect", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Connection failed");
      }

      if (!data.url) {
        throw new Error("Telegram URL not returned");
      }

      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Connection failed",
      );
    } finally {
      setConnecting(false);
    }
  }

  const telegram = status?.telegram;

  const fullName = [
    telegram?.firstName,
    telegram?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">
            Telegram Bot
          </h2>

          <p className="mt-2 text-sm text-neutral-500">
            Har kuni Vocabulary testlari va eslatmalarni
            Telegram orqali oling.
          </p>
        </div>

        {status?.connected && (
          <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            ● Connected
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-6 text-sm text-neutral-500">
          Loading Telegram status...
        </div>
      ) : status?.connected && telegram ? (
        <div className="mt-6">
          <div className="flex items-center gap-4 rounded-lg border border-neutral-200 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-lg font-semibold text-neutral-700">
              {(telegram.firstName || telegram.username || "T")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-neutral-900">
                {fullName || "Telegram User"}
              </h3>

              <p className="mt-1 text-sm text-neutral-500">
                {telegram.username
                  ? `@${telegram.username}`
                  : "Username mavjud emas"}
              </p>
            </div>

            <span className="text-xs font-medium text-green-600">
              Verified
            </span>
          </div>

          <div className="mt-5 divide-y divide-neutral-100 rounded-lg border border-neutral-200 px-4">
            <div className="flex items-center justify-between gap-4 py-4">
              <span className="text-sm text-neutral-500">
                Telegram ID
              </span>

              <span className="text-sm font-medium text-neutral-900">
                {telegram.telegramId}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-4">
              <span className="text-sm text-neutral-500">
                Notifications
              </span>

              <span
                className={`text-sm font-medium ${
                  telegram.notificationsEnabled
                    ? "text-green-600"
                    : "text-neutral-500"
                }`}
              >
                {telegram.notificationsEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-4">
              <span className="text-sm text-neutral-500">
                Reminder hours
              </span>

              <span className="text-sm font-medium text-neutral-900">
                {telegram.reminderHours
                  .map((hour) => `${String(hour).padStart(2, "0")}:00`)
                  .join(", ")}
              </span>
            </div>
          </div>

          <button
            onClick={() => void loadStatus()}
            className="mt-5 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            Refresh status
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <button
            onClick={connectTelegram}
            disabled={connecting}
            className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            {connecting ? "Connecting..." : "Connect Telegram"}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}