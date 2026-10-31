"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  CircuitBoard,
  Clock3,
  Hash,
  Loader2,
  ServerCog,
} from "lucide-react";

type Provider = {
  name: "gemini" | "claude" | "openai";
  enabled: boolean;
  model: string;
  priority: number;
};

type Config = {
  providers: Provider[];
  fallbackEnabled: boolean;
  timeoutMs: number;
  maxOutputTokens: number;
  dailyRequestLimit: number;
  autoGenerate: boolean;
  generationTime: string;
  timezone: string;
  english: { level: string; dailyMinutes: number; exercisesPerDay: number };
  german: { level: string; dailyMinutes: number; exercisesPerDay: number };
};

type ApiKeys = {
  gemini: boolean;
  claude: boolean;
  openai: boolean;
};

const PROVIDER_LABEL: Record<Provider["name"], string> = {
  gemini: "Google Gemini",
  claude: "Anthropic Claude",
  openai: "OpenAI",
};

export function AiConfigForm() {
  const [config, setConfig] = useState<Config | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/ai-config", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Yuklab bo‘lmadi");
      }
      setConfig(data.config);
      setApiKeys(data.apiKeys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noma'lum xatolik");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setSavedAt(null);
    setError("");

    try {
      const response = await fetch("/api/admin/ai-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          providers: config.providers,
          fallbackEnabled: config.fallbackEnabled,
          timeoutMs: config.timeoutMs,
          maxOutputTokens: config.maxOutputTokens,
          dailyRequestLimit: config.dailyRequestLimit,
          autoGenerate: config.autoGenerate,
          generationTime: config.generationTime,
          english: config.english,
          german: config.german,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Saqlab bo‘lmadi");
      }
      setConfig(data.config);
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noma'lum xatolik");
    } finally {
      setSaving(false);
    }
  }

  function updateProvider(
    index: number,
    patch: Partial<Provider>,
  ) {
    if (!config) return;
    const next = config.providers.map((p, i) =>
      i === index ? { ...p, ...patch } : p,
    );
    setConfig({ ...config, providers: next });
  }

  function moveProvider(index: number, delta: -1 | 1) {
    if (!config) return;
    const target = index + delta;
    if (target < 0 || target >= config.providers.length) return;
    const next = [...config.providers];
    [next[index], next[target]] = [next[target], next[index]];
    next.forEach((p, i) => {
      p.priority = i + 1;
    });
    setConfig({ ...config, providers: next });
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error || "Konfiguratsiyani yuklab bo‘lmadi"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Providers */}
      <section className="rounded-lg border border-rule bg-white p-5">
        <header className="mb-4">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <CircuitBoard size={15} />
            AI Providers
          </h2>
          <p className="mt-1 text-[12px] text-ink-3">
            Fallback tartibi: tepadan pastgacha. Yuqori — birinchi urinish.
          </p>
        </header>

        <div className="space-y-3">
          {config.providers.map((p, i) => {
            const hasKey = apiKeys?.[p.name] ?? false;

            return (
              <div
                key={p.name}
                className="flex flex-wrap items-center gap-3 rounded-md border border-rule bg-surface-2 p-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-ink text-[11px] font-semibold text-white">
                    {i + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">
                      {PROVIDER_LABEL[p.name]}
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      {p.name} ·{" "}
                      {hasKey ? (
                        <span className="text-ok">API key ✓</span>
                      ) : (
                        <span className="text-danger">API key missing</span>
                      )}
                    </p>
                  </div>
                </div>

                <input
                  type="text"
                  value={p.model}
                  onChange={(e) =>
                    updateProvider(i, { model: e.target.value })
                  }
                  className="h-8 w-44 rounded-md border border-rule bg-white px-2 font-mono text-[11px] text-ink focus:border-ink focus:outline-none"
                />

                <label className="inline-flex items-center gap-1.5 text-[11px] text-ink-2">
                  <input
                    type="checkbox"
                    checked={p.enabled}
                    onChange={(e) =>
                      updateProvider(i, { enabled: e.target.checked })
                    }
                    className="size-3.5 accent-black"
                  />
                  Enabled
                </label>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveProvider(i, -1)}
                    disabled={i === 0}
                    className="size-7 rounded-md border border-rule bg-white text-[11px] text-ink-2 hover:text-ink disabled:opacity-40"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveProvider(i, 1)}
                    disabled={i === config.providers.length - 1}
                    className="size-7 rounded-md border border-rule bg-white text-[11px] text-ink-2 hover:text-ink disabled:opacity-40"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <label className="mt-4 inline-flex items-center gap-2 text-[12px] text-ink-2">
          <input
            type="checkbox"
            checked={config.fallbackEnabled}
            onChange={(e) =>
              setConfig({ ...config, fallbackEnabled: e.target.checked })
            }
            className="size-3.5 accent-black"
          />
          Fallback zanjirini yoqish
        </label>
      </section>

      {/* Request limits */}
      <section className="rounded-lg border border-rule bg-white p-5">
        <header className="mb-4">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <ServerCog size={15} />
            Request limits
          </h2>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Timeout (ms)"
            value={config.timeoutMs}
            min={5000}
            max={120000}
            step={1000}
            onChange={(v) => setConfig({ ...config, timeoutMs: v })}
          />
          <NumberField
            label="Max output tokens"
            value={config.maxOutputTokens}
            min={200}
            max={8000}
            step={100}
            onChange={(v) => setConfig({ ...config, maxOutputTokens: v })}
          />
          <NumberField
            label="Daily request limit"
            value={config.dailyRequestLimit}
            min={10}
            max={5000}
            step={10}
            onChange={(v) =>
              setConfig({ ...config, dailyRequestLimit: v })
            }
          />
        </div>
      </section>

      {/* Scheduler */}
      <section className="rounded-lg border border-rule bg-white p-5">
        <header className="mb-4">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <Clock3 size={15} />
            Daily generation
          </h2>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="inline-flex items-center gap-2 text-[12px] text-ink-2">
            <input
              type="checkbox"
              checked={config.autoGenerate}
              onChange={(e) =>
                setConfig({ ...config, autoGenerate: e.target.checked })
              }
              className="size-3.5 accent-black"
            />
            Avtomatik har kuni yaratish
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3">
              Vaqt ({config.timezone})
            </span>
            <input
              type="time"
              value={config.generationTime}
              onChange={(e) =>
                setConfig({ ...config, generationTime: e.target.value })
              }
              className="h-9 w-32 rounded-md border border-rule bg-white px-2 text-[13px] focus:border-ink focus:outline-none"
            />
          </label>
        </div>
      </section>

      {/* Per-language defaults */}
      <section className="grid gap-4 lg:grid-cols-2">
        {(["english", "german"] as const).map((lang) => (
          <div
            key={lang}
            className="rounded-lg border border-rule bg-white p-5"
          >
            <header className="mb-4">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                <Hash size={14} />
                {lang === "english" ? "🇬🇧 English" : "🇩🇪 German"} defaults
              </h2>
            </header>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3">
                  Default level
                </span>
                <input
                  type="text"
                  value={config[lang].level}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      [lang]: { ...config[lang], level: e.target.value },
                    })
                  }
                  className="h-9 w-full rounded-md border border-rule bg-white px-2 text-[13px] focus:border-ink focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Daily minutes"
                  value={config[lang].dailyMinutes}
                  min={15}
                  max={600}
                  step={5}
                  onChange={(v) =>
                    setConfig({
                      ...config,
                      [lang]: { ...config[lang], dailyMinutes: v },
                    })
                  }
                />
                <NumberField
                  label="Exercises/day"
                  value={config[lang].exercisesPerDay}
                  min={1}
                  max={30}
                  step={1}
                  onChange={(v) =>
                    setConfig({
                      ...config,
                      [lang]: { ...config[lang], exercisesPerDay: v },
                    })
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Save bar */}
      <div className="sticky bottom-0 -mx-5 flex items-center justify-end gap-3 border-t border-rule bg-white px-5 py-4 md:-mx-8 md:px-8">
        {error && (
          <p className="mr-auto inline-flex items-center gap-1.5 text-[12px] text-red-600">
            <AlertCircle size={13} />
            {error}
          </p>
        )}

        {savedAt && !error && (
          <p className="mr-auto inline-flex items-center gap-1.5 text-[12px] text-ok">
            <Check size={13} />
            Saqlandi
          </p>
        )}

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#333333] disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Saqlanmoqda…
            </>
          ) : (
            "Saqlash"
          )}
        </button>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3">
        {label}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 w-full rounded-md border border-rule bg-white px-2 text-[13px] tabular-nums focus:border-ink focus:outline-none"
      />
    </label>
  );
}
