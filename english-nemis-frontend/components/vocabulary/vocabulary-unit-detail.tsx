"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Headphones,
  Layers3,
  Loader2,
  RotateCcw,
  Volume2,
  XCircle,
} from "lucide-react";

import type {
  UnitDetailResponse,
} from "../../types/vocabulary/types";

type Props = {
  unitId: string;
};

type Tab = "words" | "exercises" | "reading";

type QuizResultItem = {
  exerciseId: string;
  userAnswer: string;
  correct: boolean;
  correctAnswer: string | number | null;
  explanationUz: string;
};

type QuizResponse = {
  success: boolean;
  score: number;
  correct: number;
  total: number;
  results: QuizResultItem[];
};

type ReadingResult = {
  questionId: string;
  userAnswer: string;
  correct: boolean;
  correctAnswer: string | number | null;
};

type ReadingResponse = {
  success: boolean;
  score: number;
  correct: number;
  total: number;
  results: ReadingResult[];
};

export default function VocabularyUnitDetail({
  unitId,
}: Props) {
  const [data, setData] = useState<UnitDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("words");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<QuizResponse | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");
  const quizStartedRef = useRef<number>(Date.now());
  const [readingAnswers, setReadingAnswers] = useState<
    Record<string, string>
  >({});
  const [readingResult, setReadingResult] =
    useState<ReadingResponse | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);
  const [readingError, setReadingError] = useState("");
  const readingStartedRef = useRef<number>(Date.now());

  useEffect(() => {
    const controller = new AbortController();

    async function loadUnit() {
      setLoading(true);
      setError("");
      setData(null);

      try {
        const response = await fetch(
          `/api/vocabulary/units/${encodeURIComponent(unitId)}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const text = await response.text();

        if (!text.trim()) {
          throw new Error(
            `API bo‘sh javob qaytardi (${response.status})`
          );
        }

        let result: UnitDetailResponse;

        try {
          result = JSON.parse(text) as UnitDetailResponse;
        } catch {
          throw new Error("API noto‘g‘ri JSON qaytardi");
        }

        if (!response.ok || !result.success) {
          throw new Error(
            `Unit ma'lumotlarini yuklab bo‘lmadi (${response.status})`
          );
        }

        if (controller.signal.aborted) return;

        setData(result);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Xatolik yuz berdi"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadUnit();

    return () => controller.abort();
  }, [unitId]);

  // Infer language from first word (unit itself doesn't carry it).
  const language: "english" | "german" =
    data?.words[0]?.language ?? "english";

  const isGerman = language === "german";

  function speak(text: string) {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = isGerman ? "de-DE" : "en-US";
    utterance.rate = 0.85;

    window.speechSynthesis.speak(utterance);
  }

  const tabs = [
    {
      id: "words" as const,
      label: "Vocabulary",
      icon: BookOpen,
      count: data?.words.length ?? 0,
    },
    {
      id: "exercises" as const,
      label: "Exercises",
      icon: ClipboardList,
      count: data?.exercises.length ?? 0,
    },
    {
      id: "reading" as const,
      label: "Reading",
      icon: CheckCircle2,
      count: data?.reading ? 1 : 0,
    },
  ];

  return (
    <div className="min-h-full bg-white text-ink">

      {/* PAGE HEADER */}
      <header className="border-b border-rule bg-white">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">

          {/* BREADCRUMB */}
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-[13px] text-[#888888]">
            <Link
              href="/dashboard/vocabulary"
              className="transition-colors hover:text-ink"
            >
              Vocabulary
            </Link>

            <ChevronRight className="h-3.5 w-3.5" />

            {data?.unit.book ? (
              <Link
                href={`/dashboard/vocabulary/${data.unit.book}`}
                className="transition-colors hover:text-ink"
              >
                Book
              </Link>
            ) : (
              <span>Book</span>
            )}

            <ChevronRight className="h-3.5 w-3.5" />

            <span className="font-medium text-ink">
              {data?.unit.title || "Unit"}
            </span>
          </nav>

          {/* BACK BUTTON */}
          <Link
            href={
              data?.unit.book
                ? `/dashboard/vocabulary/${data.unit.book}`
                : "/dashboard/vocabulary"
            }
            className="mb-6 inline-flex h-8 items-center gap-2 rounded-md border border-rule bg-white px-3 text-xs font-medium text-[#666666] transition-colors hover:border-[#bdbdbd] hover:bg-surface-2 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Unitlarga qaytish
          </Link>

          {/* TITLE */}
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-rule bg-surface-2">
                  <GraduationCap className="h-4 w-4 text-ink" />
                </div>

                <span className="text-xs font-medium text-[#666666]">
                  {isGerman ? "German" : "English"} Vocabulary
                </span>
              </div>

              <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-ink sm:text-[34px]">
                {loading
                  ? "Loading..."
                  : data?.unit.title || "Vocabulary Unit"}
              </h1>

              <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#666666]">
                Yangi so‘zlarni o‘rganing, talaffuzni mashq qiling
                va reading orqali bilimingizni mustahkamlang.
              </p>
            </div>

            {data && (
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rule bg-white px-3 text-xs font-medium text-[#666666]">
                  <span aria-hidden="true">{isGerman ? "🇩🇪" : "🇬🇧"}</span>
                  {isGerman ? "German" : "English"}
                </span>

                <span className="inline-flex h-8 items-center rounded-md border border-rule bg-surface-2 px-3 text-xs font-medium text-[#444444]">
                  Unit {data.unit.unitNumber}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">

        {/* LOADING */}
        {loading && (
          <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-rule bg-white">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[#888888]" />

              <p className="text-xs text-[#888888]">
                Unit yuklanmoqda...
              </p>
            </div>
          </div>
        )}

        {/* ERROR */}
        {!loading && (error || !data) && (
          <div className="rounded-lg border border-[#f5c2c0] bg-danger-bg p-5">
            <h3 className="text-sm font-semibold text-danger">
              Ma'lumotlarni yuklashda xatolik
            </h3>

            <p className="mt-2 text-[13px] text-danger">
              {error || "Unit topilmadi"}
            </p>
          </div>
        )}

        {/* CONTENT */}
        {!loading && !error && data && (
          <>

            {/* OVERVIEW */}
            <div className="mb-9 grid grid-cols-2 gap-3 sm:grid-cols-3">

              <div className="rounded-lg border border-rule bg-white p-4">
                <p className="text-xs font-medium text-[#888888]">
                  Total Words
                </p>

                <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  {data.words.length}
                </p>
              </div>

              <div className="rounded-lg border border-rule bg-white p-4">
                <p className="text-xs font-medium text-[#888888]">
                  Exercises
                </p>

                <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  {data.exercises.length}
                </p>
              </div>

              <div className="col-span-2 rounded-lg border border-rule bg-white p-4 sm:col-span-1">
                <p className="text-xs font-medium text-[#888888]">
                  Reading
                </p>

                <p className="mt-2 text-lg font-semibold text-ink">
                  {data.reading ? "Available" : "Not available"}
                </p>
              </div>

            </div>

            {/* TABS */}
            <div className="mb-7 border-b border-rule">
              <div className="flex gap-6 overflow-x-auto">

                {tabs.map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={`
                        relative flex shrink-0 items-center gap-2
                        border-b-2 px-1 pb-4 pt-2
                        text-[13px] font-medium
                        transition-colors
                        ${
                          active
                            ? "border-ink text-ink"
                            : "border-transparent text-[#888888] hover:text-ink"
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />

                      {item.label}

                      <span
                        className={`
                          rounded-md px-1.5 py-0.5
                          text-[11px]
                          ${
                            active
                              ? "bg-rule-soft text-ink"
                              : "bg-surface-2 text-[#888888]"
                          }
                        `}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}

              </div>
            </div>

            {/* VOCABULARY */}
            {tab === "words" && (
              <div>

                {/* SECTION HEADER */}
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-[17px] font-semibold tracking-tight text-ink">
                      Vocabulary Words
                    </h2>

                    <p className="mt-1 text-[13px] text-[#888888]">
                      So‘zlarni o‘rganing va talaffuzini tinglang.
                    </p>
                  </div>

                  <span className="rounded-md border border-rule bg-surface-2 px-2.5 py-1 text-xs font-medium text-[#666666]">
                    {data.words.length} words
                  </span>
                </div>

                {data.words.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-rule bg-white p-10 text-center text-[13px] text-[#888888]">
                    Bu unit uchun so‘zlar hali qo‘shilmagan.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">

                    {data.words.map((word, index) => (
                      <div
                        key={word._id}
                        className="
                          group rounded-xl
                          border border-rule
                          bg-white p-5
                          transition-all duration-200
                          hover:border-[#bdbdbd]
                          hover:shadow-[0_4px_16px_rgba(0,0,0,0.045)]
                        "
                      >

                        {/* WORD HEADER */}
                        <div className="flex items-start justify-between gap-3">

                          <div className="flex items-start gap-3">

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-rule bg-surface-2 text-[12px] font-semibold text-[#666666]">
                              {String(index + 1).padStart(2, "0")}
                            </div>

                            <div>
                              <div className="flex items-baseline gap-2">
                                {isGerman && word.article && (
                                  <span
                                    className={[
                                      "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                      word.article === "der"
                                        ? "bg-[#e7eef7] text-english"
                                        : word.article === "die"
                                          ? "bg-[#f7e7ec] text-[#8b2447]"
                                          : "bg-[#eef2eb] text-[#3f6b3a]",
                                    ].join(" ")}
                                  >
                                    {word.article}
                                  </span>
                                )}

                                <h3 className="text-[18px] font-semibold tracking-tight text-ink">
                                  {word.word}
                                </h3>
                              </div>

                              {word.pronunciation && (
                                <p className="mt-1 text-[12px] text-[#888888]">
                                  {word.pronunciation}
                                </p>
                              )}

                              {isGerman && word.plural && (
                                <p className="mt-1 text-[11px] text-[#888888]">
                                  Pl.{" "}
                                  <span className="font-medium text-ink-2">
                                    {word.plural}
                                  </span>
                                </p>
                              )}

                              {word.partOfSpeech && (
                                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted">
                                  {word.partOfSpeech}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* SPEAK BUTTON */}
                          <button
                            type="button"
                            onClick={() => speak(word.word)}
                            aria-label={`${word.word} talaffuzini eshitish`}
                            className="
                              flex h-9 w-9 shrink-0 items-center justify-center
                              rounded-md border border-rule
                              bg-white text-[#666666]
                              transition-colors
                              hover:border-[#bdbdbd]
                              hover:bg-surface-2
                              hover:text-ink
                            "
                          >
                            <Volume2 className="h-4 w-4" />
                          </button>

                        </div>

                        {/* TRANSLATION */}
                        <div className="mt-5">
                          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">
                            Translation
                          </p>

                          <p className="text-[14px] font-semibold text-ink">
                            {word.translationUz || "Tarjima kiritilmagan"}
                          </p>
                        </div>

                        {/* DEFINITION */}
                        {word.definition && (
                          <div className="mt-4">
                            <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">
                              Definition
                            </p>

                            <p className="text-[13px] leading-6 text-[#666666]">
                              {word.definition}
                            </p>
                          </div>
                        )}

                        {/* EXAMPLE */}
                        {word.example && (
                          <div className="mt-5 rounded-lg border border-rule bg-surface-2 p-4">

                            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">
                              Example
                            </p>

                            <p className="text-[13px] leading-6 text-ink">
                              {word.example}
                            </p>

                            {word.exampleUz && (
                              <p className="mt-2 border-t border-rule pt-2 text-[12px] leading-5 text-[#888888]">
                                {word.exampleUz}
                              </p>
                            )}

                          </div>
                        )}

                      </div>
                    ))}

                  </div>
                )}
              </div>
            )}

            {/* EXERCISES */}
            {tab === "exercises" && (
              <div className="space-y-5">

                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-[17px] font-semibold tracking-tight text-ink">
                      Practice Exercises
                    </h2>

                    <p className="mt-1 text-[13px] text-[#888888]">
                      Javoblarni belgilang, so‘ng tekshiring.
                    </p>
                  </div>

                  {quizResult && (
                    <div className="flex items-center gap-3 rounded-lg border border-rule bg-surface-2 px-3 py-2 text-[12px]">
                      <span className="text-ink-3">Natija</span>
                      <span className="font-semibold tabular-nums text-ink">
                        {quizResult.correct} / {quizResult.total}
                      </span>
                      <span className="text-muted">·</span>
                      <span className="font-semibold tabular-nums text-ink">
                        {quizResult.score}%
                      </span>
                    </div>
                  )}
                </div>

                {data.exercises.length === 0 ? (
                  <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed border-rule bg-white p-8 text-center">

                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-rule bg-surface-2">
                      <ClipboardList className="h-5 w-5 text-[#666666]" />
                    </div>

                    <h3 className="text-sm font-semibold text-ink">
                      Mashqlar mavjud emas
                    </h3>

                    <p className="mt-2 text-[13px] text-[#888888]">
                      Bu unit uchun mashqlar hali qo‘shilmagan.
                    </p>

                  </div>
                ) : (
                  data.exercises.map((exercise, index) => {
                    const exId =
                      exercise.id ?? exercise._id ?? String(index);
                    const userAnswer = answers[exId] ?? "";

                    const result = quizResult?.results.find(
                      (r) => r.exerciseId === exId,
                    );

                    return (
                      <div
                        key={exId}
                        className="rounded-xl border border-rule bg-white p-5 sm:p-6"
                      >
                        {/* EXERCISE HEADER */}
                        <div className="mb-5 flex items-center justify-between gap-3">
                          <span className="text-[12px] font-semibold text-ink">
                            Exercise {String(index + 1).padStart(2, "0")}
                          </span>

                          <div className="flex items-center gap-2">
                            {result && (
                              <span
                                className={[
                                  "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium",
                                  result.correct
                                    ? "bg-ok-bg text-ok"
                                    : "bg-[#fdeceb] text-danger",
                                ].join(" ")}
                              >
                                {result.correct ? (
                                  <>
                                    <CheckCircle2 size={10} /> To‘g‘ri
                                  </>
                                ) : (
                                  <>
                                    <XCircle size={10} /> Xato
                                  </>
                                )}
                              </span>
                            )}

                            <span className="rounded-md border border-rule bg-surface-2 px-2.5 py-1 text-[11px] font-medium capitalize text-[#666666]">
                              {exercise.type.replaceAll("_", " ")}
                            </span>
                          </div>
                        </div>

                        <h3 className="text-[15px] font-medium leading-7 text-ink">
                          {exercise.question}
                        </h3>

                        {exercise.options.length > 0 ? (
                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            {exercise.options.map((option) => {
                              const isSelected = userAnswer === option;
                              const isCorrect =
                                quizResult != null &&
                                result?.correctAnswer === option;
                              const isWrong =
                                quizResult != null &&
                                isSelected &&
                                result &&
                                !result.correct;

                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() =>
                                    !quizResult &&
                                    setAnswers((prev) => ({
                                      ...prev,
                                      [exId]: option,
                                    }))
                                  }
                                  disabled={!!quizResult}
                                  className={[
                                    "flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-[13px] transition-colors",
                                    isCorrect
                                      ? "border-ok bg-ok-bg text-ok"
                                      : isWrong
                                        ? "border-danger bg-danger-bg text-danger"
                                        : isSelected
                                          ? "border-ink bg-ink text-white"
                                          : "border-rule bg-white text-[#444444] hover:border-[#bdbdbd] hover:bg-surface-2",
                                  ].join(" ")}
                                >
                                  <span>{option}</span>
                                  {quizResult && isCorrect && (
                                    <CheckCircle2 size={14} />
                                  )}
                                  {quizResult && isWrong && (
                                    <XCircle size={14} />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={userAnswer}
                            onChange={(e) =>
                              !quizResult &&
                              setAnswers((prev) => ({
                                ...prev,
                                [exId]: e.target.value,
                              }))
                            }
                            disabled={!!quizResult}
                            placeholder="Javobingizni yozing..."
                            className={[
                              "mt-5 w-full rounded-lg border px-4 py-3 text-[13px] outline-none transition-colors",
                              quizResult
                                ? result?.correct
                                  ? "border-ok bg-ok-bg text-ok"
                                  : "border-danger bg-danger-bg text-danger"
                                : "border-rule bg-white text-ink placeholder:text-[#999999] focus:border-ink",
                            ].join(" ")}
                          />
                        )}

                        {quizResult && result && !result.correct && result.correctAnswer != null && (
                          <p className="mt-3 text-[12px] leading-5 text-ink-3">
                            To‘g‘ri javob: <span className="font-medium text-ink">{String(result.correctAnswer)}</span>
                          </p>
                        )}

                        {quizResult && result?.explanationUz && (
                          <p className="mt-2 text-[11px] leading-5 text-[#888888]">
                            {result.explanationUz}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}

                {data.exercises.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5">
                    {quizError && (
                      <p className="text-[12px] text-red-600">
                        {quizError}
                      </p>
                    )}

                    <div className="ml-auto flex items-center gap-2">
                      {quizResult ? (
                        <button
                          type="button"
                          onClick={() => {
                            setQuizResult(null);
                            setAnswers({});
                            setQuizError("");
                            quizStartedRef.current = Date.now();
                          }}
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-rule bg-white px-3.5 text-[12px] font-medium text-ink-2 hover:border-[#d4d4d4] hover:text-ink"
                        >
                          <RotateCcw size={13} />
                          Qayta urinish
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            if (quizLoading) return;
                            const payload = data.exercises
                              .map((ex, i) => {
                                const exId = ex.id ?? ex._id ?? String(i);
                                return {
                                  exerciseId: exId,
                                  answer: answers[exId] ?? "",
                                };
                              })
                              .filter((p) => p.answer.length > 0);

                            if (payload.length === 0) {
                              setQuizError("Kamida bitta savolga javob bering");
                              return;
                            }

                            setQuizLoading(true);
                            setQuizError("");

                            try {
                              const response = await fetch(
                                `/api/vocabulary/units/${unitId}/quiz`,
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  credentials: "include",
                                  body: JSON.stringify({
                                    answers: payload,
                                    durationSeconds: Math.round(
                                      (Date.now() -
                                        quizStartedRef.current) /
                                        1000,
                                    ),
                                  }),
                                },
                              );
                              const result = await response.json();
                              if (!response.ok || !result.success) {
                                throw new Error(
                                  result.message || "Tekshirib bo‘lmadi",
                                );
                              }
                              setQuizResult(result as QuizResponse);
                            } catch (err) {
                              setQuizError(
                                err instanceof Error
                                  ? err.message
                                  : "Noma'lum xatolik",
                              );
                            } finally {
                              setQuizLoading(false);
                            }
                          }}
                          disabled={quizLoading}
                          className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#333333] disabled:opacity-60"
                        >
                          {quizLoading ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              Tekshirilmoqda…
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={13} />
                              Javoblarni tekshirish
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* READING */}
            {tab === "reading" && (
              <div className="space-y-6">

                <div className="mb-5">
                  <h2 className="text-[17px] font-semibold tracking-tight text-ink">
                    Reading Practice
                  </h2>

                  <p className="mt-1 text-[13px] text-[#888888]">
                    Matnni o‘qing va tushunish ko‘nikmangizni rivojlantiring.
                  </p>
                </div>

                {!data.reading ? (
                  <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed border-rule bg-white p-8 text-center">

                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-rule bg-surface-2">
                      <BookOpen className="h-5 w-5 text-[#666666]" />
                    </div>

                    <h3 className="text-sm font-semibold text-ink">
                      Reading mavjud emas
                    </h3>

                    <p className="mt-2 text-[13px] text-[#888888]">
                      Bu unit uchun reading hali qo‘shilmagan.
                    </p>

                  </div>
                ) : (
                  <>

                    {/* READING ARTICLE */}
                    <article className="rounded-xl border border-rule bg-white p-6 sm:p-8">

                      <div className="mb-5 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-[12px] font-medium text-[#888888]">
                          <BookOpen className="h-4 w-4" />
                          Reading Passage
                        </span>

                        <button
                          type="button"
                          onClick={() => speak(data.reading!.content)}
                          className="inline-flex h-8 items-center gap-2 rounded-md border border-rule bg-white px-3 text-[12px] font-medium text-[#666666] transition-colors hover:bg-surface-2 hover:text-ink"
                        >
                          <Headphones className="h-3.5 w-3.5" />
                          Listen
                        </button>
                      </div>

                      <h2 className="mb-6 text-[24px] font-semibold tracking-[-0.035em] text-ink">
                        {data.reading.title}
                      </h2>

                      <div className="whitespace-pre-line text-[15px] leading-8 text-[#444444]">
                        {data.reading.content}
                      </div>

                      {/* TRANSLATION */}
                      {data.reading.translationUz && (
                        <details className="mt-7 rounded-lg border border-rule bg-surface-2 p-4">

                          <summary className="cursor-pointer text-[13px] font-medium text-ink">
                            O‘zbekcha tarjimani ko‘rish
                          </summary>

                          <p className="mt-4 whitespace-pre-line border-t border-rule pt-4 text-[13px] leading-7 text-[#666666]">
                            {data.reading.translationUz}
                          </p>

                        </details>
                      )}

                    </article>

                    {/* READING QUESTIONS */}
                    {data.reading.questions.length > 0 && (
                      <div className="space-y-4">

                        <div className="flex flex-wrap items-end justify-between gap-3">
                          <div>
                            <h3 className="text-[17px] font-semibold tracking-tight text-ink">
                              Reading Comprehension
                            </h3>

                            <p className="mt-1 text-[13px] text-[#888888]">
                              Matn asosidagi savollarga javob bering.
                            </p>
                          </div>

                          {readingResult && (
                            <div className="flex items-center gap-3 rounded-lg border border-rule bg-surface-2 px-3 py-2 text-[12px]">
                              <span className="text-ink-3">Natija</span>
                              <span className="font-semibold tabular-nums text-ink">
                                {readingResult.correct} / {readingResult.total}
                              </span>
                              <span className="text-muted">·</span>
                              <span className="font-semibold tabular-nums text-ink">
                                {readingResult.score}%
                              </span>
                            </div>
                          )}
                        </div>

                        {data.reading.questions.map((question, index) => {
                          const qId = question._id ?? String(index);
                          const userAnswer = readingAnswers[qId] ?? "";
                          const result = readingResult?.results.find(
                            (r) => r.questionId === qId,
                          );

                          return (
                            <div
                              key={qId}
                              className="rounded-xl border border-rule bg-white p-5 sm:p-6"
                            >
                              <div className="mb-4 flex items-center justify-between gap-3 text-[12px] font-medium text-[#888888]">
                                <span>
                                  Question {String(index + 1).padStart(2, "0")}
                                </span>

                                {result && (
                                  <span
                                    className={[
                                      "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium",
                                      result.correct
                                        ? "bg-ok-bg text-ok"
                                        : "bg-[#fdeceb] text-danger",
                                    ].join(" ")}
                                  >
                                    {result.correct ? (
                                      <>
                                        <CheckCircle2 size={10} /> To‘g‘ri
                                      </>
                                    ) : (
                                      <>
                                        <XCircle size={10} /> Xato
                                      </>
                                    )}
                                  </span>
                                )}
                              </div>

                              <p className="text-[15px] font-medium leading-7 text-ink">
                                {question.question}
                              </p>

                              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                {question.options.map((option) => {
                                  const isSelected = userAnswer === option;
                                  const isCorrect =
                                    readingResult != null &&
                                    result?.correctAnswer === option;
                                  const isWrong =
                                    readingResult != null &&
                                    isSelected &&
                                    result &&
                                    !result.correct;

                                  return (
                                    <button
                                      key={option}
                                      type="button"
                                      onClick={() =>
                                        !readingResult &&
                                        setReadingAnswers((prev) => ({
                                          ...prev,
                                          [qId]: option,
                                        }))
                                      }
                                      disabled={!!readingResult}
                                      className={[
                                        "flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-[13px] transition-colors",
                                        isCorrect
                                          ? "border-ok bg-ok-bg text-ok"
                                          : isWrong
                                            ? "border-danger bg-danger-bg text-danger"
                                            : isSelected
                                              ? "border-ink bg-ink text-white"
                                              : "border-rule bg-white text-[#444444] hover:border-[#bdbdbd] hover:bg-surface-2",
                                      ].join(" ")}
                                    >
                                      <span>{option}</span>
                                      {readingResult && isCorrect && (
                                        <CheckCircle2 size={14} />
                                      )}
                                      {readingResult && isWrong && (
                                        <XCircle size={14} />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {readingResult && result && !result.correct && result.correctAnswer != null && (
                                <p className="mt-3 text-[12px] leading-5 text-ink-3">
                                  To‘g‘ri javob:{" "}
                                  <span className="font-medium text-ink">
                                    {String(result.correctAnswer)}
                                  </span>
                                </p>
                              )}
                            </div>
                          );
                        })}

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5">
                          {readingError && (
                            <p className="text-[12px] text-red-600">
                              {readingError}
                            </p>
                          )}

                          <div className="ml-auto flex items-center gap-2">
                            {readingResult ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setReadingResult(null);
                                  setReadingAnswers({});
                                  setReadingError("");
                                  readingStartedRef.current = Date.now();
                                }}
                                className="inline-flex h-9 items-center gap-2 rounded-md border border-rule bg-white px-3.5 text-[12px] font-medium text-ink-2 hover:border-[#d4d4d4] hover:text-ink"
                              >
                                <RotateCcw size={13} />
                                Qayta urinish
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (readingLoading || !data.reading) return;

                                  const payload = data.reading.questions
                                    .map((q, i) => {
                                      const qId = q._id ?? String(i);
                                      return {
                                        questionId: qId,
                                        answer: readingAnswers[qId] ?? "",
                                      };
                                    })
                                    .filter((p) => p.answer.length > 0);

                                  if (payload.length === 0) {
                                    setReadingError(
                                      "Kamida bitta savolga javob bering",
                                    );
                                    return;
                                  }

                                  setReadingLoading(true);
                                  setReadingError("");

                                  try {
                                    const response = await fetch(
                                      `/api/vocabulary/units/${unitId}/reading-quiz`,
                                      {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        credentials: "include",
                                        body: JSON.stringify({
                                          answers: payload,
                                          durationSeconds: Math.round(
                                            (Date.now() -
                                              readingStartedRef.current) /
                                              1000,
                                          ),
                                        }),
                                      },
                                    );

                                    const result = await response.json();

                                    if (!response.ok || !result.success) {
                                      throw new Error(
                                        result.message || "Tekshirib bo‘lmadi",
                                      );
                                    }

                                    setReadingResult(result as ReadingResponse);
                                  } catch (err) {
                                    setReadingError(
                                      err instanceof Error
                                        ? err.message
                                        : "Noma'lum xatolik",
                                    );
                                  } finally {
                                    setReadingLoading(false);
                                  }
                                }}
                                disabled={readingLoading}
                                className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#333333] disabled:opacity-60"
                              >
                                {readingLoading ? (
                                  <>
                                    <Loader2
                                      size={13}
                                      className="animate-spin"
                                    />
                                    Tekshirilmoqda…
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 size={13} />
                                    Reading tekshirish
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  </>
                )}

              </div>
            )}

            {/* PAGE FOOTER */}
            <div className="mt-10 flex flex-col justify-between gap-2 border-t border-rule pt-5 text-[12px] text-[#888888] sm:flex-row sm:items-center">
              <span>
                Unit {data.unit.unitNumber} · {data.words.length} words
              </span>

              <span>
                LinguaCoach AI · Vocabulary Learning
              </span>
            </div>

          </>
        )}

      </main>
    </div>
  );
}