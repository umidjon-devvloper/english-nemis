"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  PenLine,
  RefreshCw,
  Sparkles,
} from "lucide-react";

type Language = "english" | "german";

type Correction = {
  original: string;
  corrected: string;
  reasonUz: string;
};

type VocabSuggestion = {
  instead: string;
  use: string;
};

type Feedback = {
  score: number;
  summaryUz: string;
  corrections: Correction[];
  vocabularySuggestions: VocabSuggestion[];
  rewrittenVersion: string;
};

type Props = {
  englishLevel: string;
  germanLevel: string;
};

const TOPICS: Record<Language, string[]> = {
  english: [
    "My typical Monday morning",
    "A place I want to visit",
    "A time I had to solve a problem",
    "What I ate yesterday and why",
    "A short review of a book I liked",
  ],
  german: [
    "Mein typischer Montagmorgen",
    "Ein Ort, den ich besuchen möchte",
    "Ein kurzer Tagesablauf",
    "Mein Lieblingsessen",
    "Meine Pläne für das Wochenende",
  ],
};

const META: Record<Language, { label: string; flag: string; prompt: string; cta: string }> = {
  english: {
    label: "English",
    flag: "🇬🇧",
    prompt: "Pick a topic and write 3–6 sentences in English.",
    cta: "Get feedback",
  },
  german: {
    label: "German",
    flag: "🇩🇪",
    prompt: "Wähle ein Thema und schreibe 3–6 Sätze auf Deutsch.",
    cta: "Feedback bekommen",
  },
};

export function WritingSession({ englishLevel, germanLevel }: Props) {
  const [language, setLanguage] = useState<Language>("english");
  const [topic, setTopic] = useState("");
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startedAt] = useState(() => Date.now());
  const sessionLoggedRef = useRef(false);

  const level =
    language === "english" ? englishLevel : germanLevel;
  const meta = META[language];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const trimmedTopic = topic.trim();
    const trimmedDraft = draft.trim();

    if (trimmedTopic.length < 2) {
      setError("Mavzuni tanlang yoki yozing.");
      return;
    }

    if (trimmedDraft.length < 10) {
      setError("Kamida 10 belgi matn kiriting.");
      return;
    }

    setLoading(true);
    setError("");
    setFeedback(null);

    try {
      const response = await fetch("/api/practice/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          language,
          topic: trimmedTopic,
          draft: trimmedDraft,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "AI javob bermadi");
      }

      setFeedback(data.feedback as Feedback);

      if (!sessionLoggedRef.current) {
        sessionLoggedRef.current = true;
        const minutes = Math.max(
          1,
          Math.round((Date.now() - startedAt) / 60000),
        );

        void fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            language,
            activity: "writing",
            durationMinutes: Math.min(minutes, 60),
          }),
          keepalive: true,
        }).catch(() => {});
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Noma'lum xatolik",
      );
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFeedback(null);
    setDraft("");
    setError("");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-6 md:px-8">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/dashboard/practice"
            className="mb-3 inline-flex h-8 items-center gap-2 rounded-md border border-rule bg-white px-3 text-[11px] font-medium text-[#666666] transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Practice
          </Link>

          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink">
            Guided Writing
          </h1>

          <p className="mt-1 text-[12px] text-ink-3">
            {meta.label} · Level {level} · AI tuzatma va yangi so‘zlar.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Language"
          className="inline-flex items-center rounded-md border border-rule bg-surface-2 p-0.5"
        >
          {(Object.keys(META) as Language[]).map((lang) => {
            const active = lang === language;
            return (
              <button
                key={lang}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  if (lang === language) return;
                  setLanguage(lang);
                  reset();
                  setTopic("");
                }}
                className={[
                  "inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                    : "text-[#666666] hover:text-ink",
                ].join(" ")}
              >
                <span>{META[lang].flag}</span>
                {META[lang].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Composer */}
      <form
        onSubmit={submit}
        className="rounded-lg border border-rule bg-white p-5"
      >
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3">
            Mavzu
          </span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={meta.prompt}
            maxLength={200}
            className="h-10 w-full rounded-md border border-rule bg-white px-3 text-[13px] text-ink focus:border-ink focus:outline-none"
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          {TOPICS[language].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTopic(t)}
              className="inline-flex h-7 items-center rounded-md border border-rule bg-surface-2 px-2.5 text-[11px] font-medium text-ink-2 transition-colors hover:border-[#d4d4d4] hover:text-ink"
            >
              {t}
            </button>
          ))}
        </div>

        <label className="mt-5 block">
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3">
            Draft
          </span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              language === "english"
                ? "Write a short paragraph…"
                : "Schreibe einen kurzen Absatz…"
            }
            rows={6}
            maxLength={4000}
            className="w-full resize-y rounded-md border border-rule bg-white px-3 py-2.5 text-[13px] leading-6 text-ink focus:border-ink focus:outline-none"
          />
          <p className="mt-1 text-right text-[10px] text-muted">
            {draft.length} / 4000
          </p>
        </label>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-[#f5c2c0] bg-danger-bg p-3 text-[12px] text-danger">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          {feedback && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-rule bg-white px-3.5 text-[12px] font-medium text-ink-2 hover:border-[#d4d4d4] hover:text-ink"
            >
              <RefreshCw size={13} />
              Yangi matn
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#333333] disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Baholanmoqda…
              </>
            ) : (
              <>
                <PenLine size={13} />
                {meta.cta}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Feedback */}
      {feedback && (
        <section className="mt-6 space-y-4">
          {/* Score */}
          <div className="rounded-lg border border-rule bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-md border border-rule bg-surface-2">
                  <Sparkles size={16} className="text-ink" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold text-ink">
                    Umumiy baho
                  </h2>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {feedback.summaryUz}
                  </p>
                </div>
              </div>

              <span className="text-[28px] font-semibold tabular-nums text-ink">
                {feedback.score}
              </span>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div
                style={{ width: `${Math.min(100, Math.max(0, feedback.score))}%` }}
                className="h-full rounded-full bg-ink"
              />
            </div>
          </div>

          {/* Corrections */}
          {feedback.corrections?.length > 0 && (
            <div className="rounded-lg border border-rule bg-white p-5">
              <h2 className="mb-4 text-[14px] font-semibold text-ink">
                Tuzatmalar
              </h2>
              <ul className="space-y-3">
                {feedback.corrections.map((c, i) => (
                  <li
                    key={i}
                    className="rounded-md border border-rule bg-surface-2 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[12px]">
                      <span className="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700 line-through">
                        {c.original}
                      </span>
                      <span className="text-muted">→</span>
                      <span className="rounded bg-green-100 px-1.5 py-0.5 font-medium text-green-800">
                        {c.corrected}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-ink-3">
                      {c.reasonUz}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Vocabulary suggestions */}
          {feedback.vocabularySuggestions?.length > 0 && (
            <div className="rounded-lg border border-rule bg-white p-5">
              <h2 className="mb-3 text-[14px] font-semibold text-ink">
                Yangi so‘zlar
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {feedback.vocabularySuggestions.map((v, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-md border border-rule bg-surface-2 px-3 py-2 text-[12px]"
                  >
                    <span className="text-muted line-through">
                      {v.instead}
                    </span>
                    <span className="text-muted">→</span>
                    <span className="font-medium text-ink">
                      {v.use}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rewritten */}
          {feedback.rewrittenVersion && (
            <div className="rounded-lg border border-rule bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-ink">
                <CheckCircle2 size={14} className="text-ok" />
                Yaxshilangan versiya
              </h2>
              <p className="whitespace-pre-line text-[13px] leading-7 text-ink">
                {feedback.rewrittenVersion}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
