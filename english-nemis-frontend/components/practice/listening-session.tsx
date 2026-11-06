"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Headphones,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react";

type Language = "english" | "german";

type ClipQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

type Clip = {
  id: string;
  language: Language;
  level: string;
  title: string;
  transcript: string;
  translationUz: string;
  durationSec: number;
  audioUrl: string;
  kind: string;
  source: { name: string; url: string; license: string };
  questions: ClipQuestion[];
};

type Props = {
  englishLevel: string;
  germanLevel: string;
};

export function ListeningSession({ englishLevel, germanLevel }: Props) {
  const [language, setLanguage] = useState<Language>("english");
  const [clips, setClips] = useState<Clip[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [rate, setRate] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<
    null | {
      correct: number;
      total: number;
      score: number;
      results: {
        questionId: string;
        correct: boolean;
        correctAnswer: string;
      }[];
    }
  >(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  const level = language === "english" ? englishLevel : germanLevel;
  const clip = clips[index] ?? null;

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");
    setClips([]);
    setIndex(0);
    setPlayCount(0);
    setShowTranscript(false);
    setAnswers({});
    setSubmitted(null);

    fetch(`/api/listening?language=${language}`, {
      cache: "no-store",
      credentials: "include",
    })
      .then((r) => r.json())
      .then((payload) => {
        if (cancelled) return;
        if (payload.success && Array.isArray(payload.clips)) {
          setClips(payload.clips);
        } else {
          setError(payload.message || "Yuklab bo'lmadi");
        }
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Yuklab bo'lmadi");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [language]);

  // When clip changes: reset audio, close transcript, clear quiz state.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    setPlaying(false);
    setPlayCount(0);
    setShowTranscript(false);
    setAnswers({});
    setSubmitted(null);
  }, [clip?.id]);

  // Apply playback rate when it changes
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
    } else {
      void a.play();
    }
  }

  async function submit() {
    if (!clip || submitted) return;
    const payload = clip.questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] ?? "",
    }));

    try {
      const response = await fetch(
        `/api/listening/${clip.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ answers: payload }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Baholab bo'lmadi");
      }
      setSubmitted({
        correct: data.correct,
        total: data.total,
        score: data.score,
        results: data.results,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    }
  }

  const hasQuestions = (clip?.questions.length ?? 0) > 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-6 md:px-8">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/dashboard/practice"
            className="mb-3 inline-flex h-8 items-center gap-2 rounded-md border border-rule bg-white px-3 text-[11px] font-medium text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Practice
          </Link>

          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink">
            Listening Lab
          </h1>

          <p className="mt-1 text-[12px] text-ink-3">
            {language === "english" ? "English" : "German"} · Level {level}
            {clip && (
              <>
                {" "}· {clip.source.name} ({clip.source.license})
              </>
            )}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Language"
          className="inline-flex items-center rounded-md border border-rule bg-surface-2 p-0.5"
        >
          {(["english", "german"] as Language[]).map((lang) => {
            const active = lang === language;
            return (
              <button
                key={lang}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setLanguage(lang)}
                className={[
                  "inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                    : "text-ink-3 hover:text-ink",
                ].join(" ")}
              >
                <span>{lang === "english" ? "🇬🇧" : "🇩🇪"}</span>
                {lang === "english" ? "English" : "German"}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-[#f5c2c0] bg-danger-bg p-5 text-[13px] text-danger">
          {error}
        </div>
      ) : clips.length === 0 ? (
        <div className="rounded-lg border border-dashed border-rule bg-white p-8 text-center">
          <Headphones size={28} className="mx-auto text-muted" />
          <p className="mt-3 text-[13px] text-ink-3">
            Bu til uchun hali audio parchalar yo'q.
          </p>
          <p className="mt-1 text-[12px] text-muted">
            Admin tez orada qo'shadi.
          </p>
        </div>
      ) : clip ? (
        <>
          {/* Clip picker */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {clips.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setIndex(i)}
                className={[
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors",
                  i === index
                    ? "border-ink bg-ink text-white"
                    : "border-rule bg-white text-ink-2 hover:border-[#d4d4d4]",
                ].join(" ")}
              >
                <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 text-[9px] font-semibold text-ink-3">
                  {c.level}
                </span>
                <span className="max-w-[160px] truncate">{c.title}</span>
              </button>
            ))}
          </div>

          {/* Player */}
          <div className="rounded-lg border border-rule bg-white p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-lg bg-ink text-white">
                <Headphones size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted">
                  Clip {index + 1} / {clips.length} · {clip.level}
                </p>
                <h2 className="truncate text-[15px] font-semibold text-ink">
                  {clip.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={togglePlay}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[12px] font-medium text-white hover:bg-[#333333]"
              >
                {playing ? (
                  <>
                    <Pause size={14} />
                    Pause
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    {playCount === 0 ? "Play" : "Replay"}
                  </>
                )}
              </button>
            </div>

            {/* Real audio element */}
            <audio
              ref={audioRef}
              src={clip.audioUrl}
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => {
                setPlaying(false);
                setPlayCount((n) => n + 1);
              }}
              controls
              className="w-full"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-ink-3">
              <span>
                Audio {playCount} marta eshitildi · {clip.source.name}
              </span>

              <div className="flex items-center gap-2">
                <label className="text-ink-3">Tezlik:</label>
                {[0.75, 1, 1.25].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRate(r)}
                    className={[
                      "inline-flex h-6 items-center rounded border px-1.5 text-[10px] font-medium transition-colors",
                      rate === r
                        ? "border-ink bg-ink text-white"
                        : "border-rule bg-white text-ink-2 hover:border-[#d4d4d4]",
                    ].join(" ")}
                  >
                    {r}×
                  </button>
                ))}
              </div>
            </div>

            {/* Transcript toggle */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowTranscript((v) => !v)}
                className="text-[11px] font-medium text-ink-2 underline underline-offset-2 hover:text-ink"
              >
                {showTranscript ? "Matnni yashirish" : "Matnni ko'rsatish"}
              </button>

              {showTranscript && (
                <div className="mt-3 rounded-md border border-rule bg-surface-2 p-3">
                  <p className="whitespace-pre-line text-[13px] leading-6 text-ink">
                    {clip.transcript}
                  </p>
                  {clip.translationUz && (
                    <p className="mt-3 border-t border-rule pt-3 text-[12px] leading-5 text-ink-3">
                      {clip.translationUz}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Questions (if any) */}
          {hasQuestions && (
            <section className="mt-5 space-y-3">
              {clip.questions.map((q, qi) => {
                const selected = answers[q.id];
                const result = submitted?.results.find(
                  (r) => r.questionId === q.id,
                );

                return (
                  <div
                    key={q.id}
                    className="rounded-lg border border-rule bg-white p-4"
                  >
                    <p className="mb-3 text-[13px] font-medium text-ink">
                      {qi + 1}. {q.prompt}
                    </p>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {q.options.map((opt) => {
                        const isSelected = selected === opt;
                        const isCorrect =
                          submitted != null && result?.correctAnswer === opt;
                        const isWrong =
                          submitted != null &&
                          isSelected &&
                          result &&
                          !result.correct;

                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              !submitted &&
                              setAnswers((a) => ({ ...a, [q.id]: opt }))
                            }
                            disabled={!!submitted}
                            className={[
                              "flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-[12px] transition-colors",
                              isCorrect
                                ? "border-ok bg-ok-bg text-ok"
                                : isWrong
                                  ? "border-danger bg-danger-bg text-danger"
                                  : isSelected
                                    ? "border-ink bg-ink text-white"
                                    : "border-rule bg-white text-ink-2 hover:border-[#d4d4d4]",
                            ].join(" ")}
                          >
                            <span>{opt}</span>
                            {submitted && isCorrect && (
                              <CheckCircle2 size={13} />
                            )}
                            {submitted && isWrong && <XCircle size={13} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between gap-3">
                {submitted ? (
                  <>
                    <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
                      <Sparkles size={14} />
                      Natija: {submitted.correct} / {submitted.total} ·{" "}
                      {submitted.score}%
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setIndex((i) => (i + 1) % Math.max(1, clips.length))
                      }
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[12px] font-medium text-white hover:bg-[#333333]"
                    >
                      <RotateCcw size={13} />
                      Keyingi clip
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={
                      clip.questions.some((q) => !answers[q.id])
                    }
                    className="ml-auto inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#333333] disabled:opacity-50"
                  >
                    <CheckCircle2 size={13} />
                    Tekshirish
                  </button>
                )}
              </div>
            </section>
          )}

          {!hasQuestions && (
            <div className="mt-5 rounded-md border border-dashed border-rule bg-surface-2 p-4 text-[12px] leading-5 text-ink-3">
              Bu clip uchun savollar hali qo'shilmagan. Siz audio'ni eshitib,
              matn bilan tekshirib chiqishingiz mumkin. AI-generated savollar
              tez orada qo'shiladi.
            </div>
          )}

          <div className="mt-6 flex items-center justify-end">
            <a
              href={clip.source.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[11px] text-muted underline underline-offset-2 hover:text-ink-3"
            >
              Manbaga o'tish →
            </a>
          </div>
        </>
      ) : null}
    </div>
  );
}
