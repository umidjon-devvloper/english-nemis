"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Lock,
  PartyPopper,
  Send,
  Sparkles,
  Volume2,
  XCircle,
} from "lucide-react";

type Language = "english" | "german";

type PackWord = {
  wordId: string;
  word: string;
  pronunciation: string;
  example: string;
  answered: boolean;
  correct: boolean | null;
  userAnswer: string;
  translationUz: string | null;
};

type Pack = {
  id: string;
  date: string;
  language: Language;
  size: number;
  completed: boolean;
  score: number | null;
  stats: {
    total: number;
    answered: number;
    correct: number;
    remaining: number;
  };
  words: PackWord[];
};

type LangProgress = {
  unlocked: boolean;
  unlockedAt?: string | null;
  packsCompleted: number;
  perfectPacks: number;
  lastPackScore: number | null;
  lastPackDate: string | null;
};

type HistoryItem = {
  date: string;
  score: number | null;
  total: number;
  correct: number;
};

type PackResponse =
  | {
      success: true;
      date: string;
      packSize: number;
      pack: Pack;
      progress: { english: LangProgress; german: LangProgress };
      history?: { english: HistoryItem[]; german: HistoryItem[] };
    }
  | {
      success: false;
      locked?: boolean;
      message: string;
      needsPerfect?: number;
      progress?: { english: LangProgress; german: LangProgress };
    };

export function DailyQuiz() {
  const [data, setData] = useState<PackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>("english");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{
    correct: boolean;
    correctAnswer: string;
  } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [finishResult, setFinishResult] = useState<{
    score: number;
    correct: number;
    total: number;
    perfect: boolean;
    unlockedLanguage: Language | null;
  } | null>(null);

  // easyMode: when true, show 4 multiple-choice buttons instead of a free-text input
  const [easyMode, setEasyMode] = useState(false);
  const [mcqOptions, setMcqOptions] = useState<string[] | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // drill: a local-only re-run of the wrong words after the pack is finished.
  // Nothing hits the backend — the pack is already closed, this is just extra
  // practice over the words the user missed today.
  const [drill, setDrill] = useState<{
    words: PackWord[];
    index: number;
    history: { wordId: string; correct: boolean }[];
    input: string;
    lastResult: {
      correct: boolean;
      correctAnswer: string;
    } | null;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void load(language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  async function load(lang: Language) {
    setLoading(true);
    setLastResult(null);
    setFinishResult(null);
    setInput("");
    setCurrentIndex(0);

    try {
      const response = await fetch(
        `/api/vocabulary/daily?language=${lang}`,
        { cache: "no-store", credentials: "include" },
      );
      const payload: PackResponse = await response.json();
      setData(payload);

      if ("pack" in payload && payload.pack) {
        // Jump to first unanswered word
        const idx = payload.pack.words.findIndex((w) => !w.answered);
        setCurrentIndex(idx === -1 ? 0 : idx);
      }
    } catch {
      setData({ success: false, message: "Yuklab bo'lmadi" });
    } finally {
      setLoading(false);
    }
  }

  const pack: Pack | null =
    data && "pack" in data ? data.pack : null;

  const current = pack?.words[currentIndex] ?? null;

  const remaining = useMemo(() => {
    if (!pack) return 0;
    return pack.words.filter((w) => !w.answered).length;
  }, [pack, currentIndex]);

  const correctCount = useMemo(() => {
    if (!pack) return 0;
    return pack.words.filter((w) => w.correct).length;
  }, [pack, currentIndex]);

  const answeredCount = pack
    ? pack.words.filter((w) => w.answered).length
    : 0;

  const progressPct = pack
    ? Math.round((answeredCount / pack.size) * 100)
    : 0;

  // Keyboard shortcuts:
  //   Enter → advance to the next word when a result is on screen
  //   1-4   → pick the corresponding MCQ option in easy mode
  useEffect(() => {
    if (!pack || drill) return;
    function onKey(e: KeyboardEvent) {
      // Advance on Enter when a result is already shown
      if (e.key === "Enter" && lastResult) {
        e.preventDefault();
        next();
        return;
      }

      // 1-4 picks an MCQ option
      if (
        easyMode &&
        !lastResult &&
        mcqOptions &&
        !sending &&
        /^[1-4]$/.test(e.key)
      ) {
        const idx = Number(e.key) - 1;
        const target = document.querySelector<HTMLButtonElement>(
          `button[data-mcq-option="${idx}"]`,
        );
        target?.click();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResult, easyMode, mcqOptions, sending, pack, drill]);

  // Load MCQ options whenever the current word changes while easyMode is on
  useEffect(() => {
    if (!easyMode || !current || !pack || lastResult) {
      setMcqOptions(null);
      return;
    }

    let cancelled = false;
    setLoadingOptions(true);
    fetch(
      `/api/vocabulary/daily/options?language=${pack.language}&wordId=${current.wordId}`,
      { cache: "no-store", credentials: "include" },
    )
      .then((r) => r.json())
      .then((payload) => {
        if (cancelled) return;
        if (payload.success && Array.isArray(payload.options)) {
          setMcqOptions(payload.options);
        } else {
          setMcqOptions(null);
        }
      })
      .catch(() => {
        if (!cancelled) setMcqOptions(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [easyMode, current?.wordId, lastResult]);

  // Client-side mirror of the backend's lenient grading, so the drill
  // mode can score answers without a round trip.
  function normalize(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[‘’ʼʻ`´']/g, "'")
      .replace(/\s+/g, " ");
  }

  function expandLocal(raw: string): string[] {
    const strings = [raw];
    const split = raw
      .split(/\s*[,/|]\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (split.length > 1) strings.push(...split);

    const extra: string[] = [];
    for (const s of strings) {
      if (/^to\s+/i.test(s)) extra.push(s.replace(/^to\s+/i, ""));
      const noParen = s.replace(/\s*\([^)]*\)\s*/g, " ").trim();
      if (noParen && noParen !== s) extra.push(noParen);
    }
    return [...strings, ...extra];
  }

  function graderCheck(expected: string | null, given: string) {
    if (!expected) return false;
    const user = normalize(given);
    if (!user) return false;
    return expandLocal(expected).map(normalize).some((c) => c === user);
  }

  function startDrill() {
    if (!pack) return;
    const wrong = pack.words.filter((w) => w.correct === false);
    if (wrong.length === 0) return;
    setDrill({
      words: wrong,
      index: 0,
      history: [],
      input: "",
      lastResult: null,
    });
  }

  function exitDrill() {
    setDrill(null);
  }

  function speak(text: string) {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = language === "german" ? "de-DE" : "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!pack || !current || !input.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetch("/api/vocabulary/daily/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          language: pack.language,
          wordId: current.wordId,
          answer: input.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Xato");
      }

      setLastResult({
        correct: !!result.correct,
        correctAnswer: result.correctAnswer || "",
      });

      // Reflect into local pack
      setData((prev) => {
        if (!prev || !("pack" in prev)) return prev;
        const newPack: Pack = {
          ...prev.pack,
          words: prev.pack.words.map((w, i) =>
            i === currentIndex
              ? {
                  ...w,
                  answered: true,
                  correct: !!result.correct,
                  userAnswer: input.trim(),
                  translationUz: result.correctAnswer,
                }
              : w,
          ),
        };
        return { ...prev, pack: newPack };
      });

      if (result.completed) {
        await finish(pack.language);
      }
    } catch (err) {
      setLastResult({
        correct: false,
        correctAnswer:
          err instanceof Error ? err.message : "Noma'lum xatolik",
      });
    } finally {
      setSending(false);
    }
  }

  function next() {
    if (!pack) return;
    setLastResult(null);
    setInput("");

    const nextIdx = pack.words.findIndex(
      (w, i) => i > currentIndex && !w.answered,
    );

    if (nextIdx === -1) {
      // Wrap around to any remaining
      const anyIdx = pack.words.findIndex((w) => !w.answered);
      if (anyIdx === -1) {
        void finish(pack.language);
        return;
      }
      setCurrentIndex(anyIdx);
    } else {
      setCurrentIndex(nextIdx);
    }

    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function finish(lang: Language) {
    if (finishing) return;
    setFinishing(true);
    try {
      const response = await fetch(
        "/api/vocabulary/daily/complete",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ language: lang }),
        },
      );
      const result = await response.json();
      if (response.ok && result.success) {
        setFinishResult({
          score: result.score ?? 0,
          correct: result.correct ?? 0,
          total: result.total ?? 0,
          perfect: !!result.perfect,
          unlockedLanguage: result.unlockedLanguage ?? null,
        });
      }
    } finally {
      setFinishing(false);
    }
  }

  const progress = data && "progress" in data ? data.progress : undefined;
  const isLocked = data && !("pack" in data) && data.locked;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-6 md:px-8">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/dashboard/vocabulary"
            className="mb-3 inline-flex h-8 items-center gap-2 rounded-md border border-rule bg-white px-3 text-[11px] font-medium text-[#666666] transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Vocabulary
          </Link>

          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink">
            Bugungi 100 so'z
          </h1>

          <p className="mt-1 text-[12px] text-ink-3">
            {language === "english" ? "🇬🇧 English" : "🇩🇪 German"}
            {" · "}
            {pack?.date}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-rule bg-white px-2.5 text-[11px] font-medium text-ink-2 hover:border-[#d4d4d4]">
            <input
              type="checkbox"
              checked={easyMode}
              onChange={(e) => setEasyMode(e.target.checked)}
              className="size-3.5 accent-black"
            />
            Oson rejim (4 variant)
          </label>

        {progress && (
          <div
            role="tablist"
            aria-label="Language"
            className="inline-flex items-center rounded-md border border-rule bg-surface-2 p-0.5"
          >
            {(["english", "german"] as Language[]).map((lang) => {
              const isActive = lang === language;
              const p = progress[lang];
              return (
                <button
                  key={lang}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    if (lang === language) return;
                    setLanguage(lang);
                  }}
                  className={[
                    "inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                      : "text-[#666666] hover:text-ink",
                  ].join(" ")}
                >
                  <span>{lang === "english" ? "🇬🇧" : "🇩🇪"}</span>
                  {lang === "english" ? "English" : "German"}
                  {!p.unlocked && <Lock size={10} className="ml-0.5 text-muted" />}
                </button>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* Progress bar */}
      {pack && (
        <div className="mb-4 rounded-lg border border-rule bg-white p-4">
          <div className="mb-2 flex items-center justify-between text-[12px]">
            <span className="text-ink-3">
              {answeredCount} / {pack.size}
            </span>
            <span className="font-medium text-ink">
              ✅ {correctCount} · ⏳ {remaining}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              style={{ width: `${progressPct}%` }}
              className="h-full rounded-full bg-ink transition-all"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-neutral-400" />
        </div>
      ) : isLocked ? (
        <div className="rounded-lg border border-rule bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-surface-2">
            <Lock className="size-5 text-muted" />
          </div>
          <h2 className="text-[16px] font-semibold text-ink">
            Nemis tili hali ochilmagan
          </h2>
          <p className="mt-2 text-[13px] leading-6 text-ink-3">
            Avval inglizchada bir kuni 100% ball oling —{" "}
            keyin nemis tili avtomatik ochiladi.
          </p>
          {progress && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-md border border-rule bg-surface-2 px-3 py-2 text-[12px]">
              <Sparkles size={13} />
              Oxirgi inglizcha natija:{" "}
              <strong className="tabular-nums text-ink">
                {progress.english.lastPackScore ?? "—"}%
              </strong>
            </div>
          )}
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setLanguage("english")}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[12px] font-medium text-white hover:bg-[#333333]"
            >
              Inglizcha pak ustida ishlash
            </button>
          </div>
        </div>
      ) : drill ? (
        (() => {
          const dw = drill.words[drill.index];
          const totalDrill = drill.words.length;
          const correctSoFar = drill.history.filter((h) => h.correct).length;
          const done = drill.history.length >= totalDrill;

          if (done) {
            return (
              <div className="rounded-lg border border-rule bg-white p-8 text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-ink text-white">
                  <Sparkles size={20} />
                </div>
                <h2 className="text-[18px] font-semibold text-ink">
                  Drill tugadi
                </h2>
                <p className="mt-2 text-[13px] text-ink-3">
                  {correctSoFar} / {totalDrill} to'g'ri
                </p>
                <div className="mt-5 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={startDrill}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-rule bg-white px-4 text-[12px] font-medium text-ink-2 hover:border-[#d4d4d4]"
                  >
                    Yana urinish
                  </button>
                  <button
                    type="button"
                    onClick={exitDrill}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[12px] font-medium text-white hover:bg-[#333333]"
                  >
                    Yopish
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div className="rounded-lg border border-rule bg-white p-8">
              <div className="mb-4 flex items-center justify-between gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface-2 px-2.5 py-1 font-medium text-ink-2">
                  <Sparkles size={11} />
                  Drill rejimi
                </span>
                <span className="text-muted">
                  {drill.index + 1} / {totalDrill} · ✅ {correctSoFar}
                </span>
              </div>

              <div className="mb-6 text-center">
                <p className="text-[32px] font-semibold tracking-tight text-ink">
                  {dw.word}
                </p>
                {dw.pronunciation && (
                  <p className="mt-2 text-[13px] text-ink-3">
                    {dw.pronunciation}
                  </p>
                )}
                {dw.example && (
                  <p className="mt-4 rounded-md border border-dashed border-rule bg-surface-2 px-3 py-2 text-[13px] italic text-ink-2">
                    {dw.example}
                  </p>
                )}
              </div>

              {drill.lastResult ? (
                <div
                  className={[
                    "rounded-lg border p-4 text-[13px]",
                    drill.lastResult.correct
                      ? "border-[#d6ead4] bg-ok-bg text-ok"
                      : "border-[#f5c2c0] bg-danger-bg text-danger",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {drill.lastResult.correct ? (
                      <>
                        <CheckCircle2 size={15} /> To'g'ri!
                      </>
                    ) : (
                      <>
                        <XCircle size={15} /> Xato.
                      </>
                    )}
                  </div>
                  <p className="mt-2 leading-5">
                    To'g'ri javob:{" "}
                    <strong className="text-ink">
                      {drill.lastResult.correctAnswer}
                    </strong>
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setDrill((d) =>
                        d
                          ? {
                              ...d,
                              index: d.index + 1,
                              input: "",
                              lastResult: null,
                            }
                          : d,
                      )
                    }
                    className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[12px] font-medium text-white hover:bg-[#333333]"
                  >
                    Keyingi so'z
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const expected = dw.translationUz;
                    const correct = graderCheck(expected, drill.input);
                    setDrill((d) =>
                      d
                        ? {
                            ...d,
                            history: [
                              ...d.history,
                              { wordId: dw.wordId, correct },
                            ],
                            lastResult: {
                              correct,
                              correctAnswer: expected || "",
                            },
                          }
                        : d,
                    );
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    autoFocus
                    value={drill.input}
                    onChange={(e) =>
                      setDrill((d) =>
                        d ? { ...d, input: e.target.value } : d,
                      )
                    }
                    placeholder="O'zbekcha tarjimasi…"
                    className="h-11 w-full rounded-md border border-rule bg-white px-3 text-[14px] text-ink focus:border-ink focus:outline-none"
                    maxLength={100}
                  />
                  <button
                    type="submit"
                    disabled={!drill.input.trim()}
                    className="inline-flex h-11 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-medium text-white hover:bg-[#333333] disabled:opacity-50"
                  >
                    <Send size={14} />
                    Yuborish
                  </button>
                </form>
              )}

              <div className="mt-5 border-t border-rule-soft pt-4 text-right">
                <button
                  type="button"
                  onClick={exitDrill}
                  className="text-[11px] font-medium text-ink-3 underline underline-offset-2 hover:text-ink"
                >
                  Drill'dan chiqish
                </button>
              </div>
            </div>
          );
        })()
      ) : finishResult ? (
        <div className="rounded-lg border border-rule bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-ink text-white">
            {finishResult.perfect ? (
              <PartyPopper size={22} />
            ) : (
              <Sparkles size={22} />
            )}
          </div>
          <h2 className="text-[20px] font-semibold text-ink">
            Pak tugadi
          </h2>
          <p className="mt-2 text-[14px] text-ink-3">
            {finishResult.correct} / {finishResult.total} to'g'ri ·{" "}
            <strong className="tabular-nums text-ink">
              {finishResult.score}%
            </strong>
          </p>

          {finishResult.perfect && finishResult.unlockedLanguage ? (
            <div className="mt-5 rounded-lg border border-[#d6ead4] bg-ok-bg p-4 text-[13px] leading-6 text-ok">
              🎉 Mukammal natija! <strong>Nemis tili ochildi</strong> — endi 🇩🇪 Grundwortschatz uchun ham kundalik pak yaratilgan.
            </div>
          ) : finishResult.perfect ? (
            <div className="mt-5 rounded-lg border border-[#d6ead4] bg-ok-bg p-4 text-[13px] text-ok">
              Mukammal 100% natija!
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-rule bg-surface-2 p-4 text-[13px] leading-6 text-ink-3">
              {language === "english" && finishResult.score < 100
                ? "Nemis tilini ochish uchun inglizcha pakda 100% olish kerak. Ertaga yangi pak chiqadi."
                : "Ertaga yangi so'zlar paki tayyor bo'ladi."}
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-2">
            {finishResult.unlockedLanguage && (
              <button
                type="button"
                onClick={() => setLanguage(finishResult.unlockedLanguage!)}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[12px] font-medium text-white hover:bg-[#333333]"
              >
                🇩🇪 Nemis pakni ochish
              </button>
            )}
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-rule bg-white px-4 text-[12px] font-medium text-ink-2 hover:border-[#d4d4d4] hover:text-ink"
            >
              Dashboard
            </Link>
          </div>

          {/* Wrong answers review */}
          {pack && pack.words.some((w) => w.answered && w.correct === false) && (
            <div className="mt-8 text-left">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-[13px] font-semibold text-ink">
                  Xatolar ro'yxati ({pack.words.filter((w) => w.correct === false).length})
                </h3>

                <button
                  type="button"
                  onClick={startDrill}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ink bg-ink px-3 text-[11px] font-medium text-white hover:bg-[#333333]"
                >
                  <Sparkles size={12} />
                  Xatolarni qayta urinish
                </button>
              </div>
              <ul className="divide-y divide-rule-soft rounded-lg border border-rule bg-white">
                {pack.words
                  .filter((w) => w.answered && w.correct === false)
                  .map((w) => (
                    <li
                      key={w.wordId}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[12px]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-ink">
                          {w.word}
                        </span>
                        {w.pronunciation && (
                          <span className="text-[11px] text-muted">
                            {w.pronunciation}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] text-red-700 line-through">
                          {w.userAnswer || "—"}
                        </span>
                        <span className="text-muted">→</span>
                        <span className="rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-medium text-green-800">
                          {w.translationUz}
                        </span>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      ) : pack && pack.stats.remaining === 0 ? (
        <div className="rounded-lg border border-rule bg-white p-8 text-center">
          <h2 className="text-[16px] font-semibold text-ink">
            Pak allaqachon tugatilgan
          </h2>
          <p className="mt-2 text-[13px] text-ink-3">
            Bugungi natija: {pack.stats.correct} / {pack.stats.total} ·{" "}
            {pack.score ?? "—"}%
          </p>
          <button
            type="button"
            onClick={() => finish(pack.language)}
            disabled={finishing}
            className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[12px] font-medium text-white hover:bg-[#333333] disabled:opacity-50"
          >
            Natijani ko'rish
          </button>
        </div>
      ) : current && pack ? (
        <div className="rounded-lg border border-rule bg-white p-8">
          <div className="mb-5 flex items-center justify-between gap-3 text-[11px] text-muted">
            <span>
              So'z {currentIndex + 1} / {pack.size}
            </span>
            <button
              type="button"
              onClick={() => speak(current.word)}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-rule bg-white px-2 text-[11px] font-medium text-ink-2 hover:text-ink"
            >
              <Volume2 size={12} />
              Eshitish
            </button>
          </div>

          <div className="mb-6 text-center">
            <p className="text-[32px] font-semibold tracking-tight text-ink">
              {current.word}
            </p>
            {current.pronunciation && (
              <p className="mt-2 text-[13px] text-ink-3">
                {current.pronunciation}
              </p>
            )}
            {current.example && (
              <p className="mt-4 rounded-md border border-dashed border-rule bg-surface-2 px-3 py-2 text-[13px] italic text-ink-2">
                {current.example}
              </p>
            )}
          </div>

          {lastResult ? (
            <div
              className={[
                "rounded-lg border p-4 text-[13px]",
                lastResult.correct
                  ? "border-[#d6ead4] bg-ok-bg text-ok"
                  : "border-[#f5c2c0] bg-danger-bg text-danger",
              ].join(" ")}
            >
              <div className="flex items-center gap-2 font-medium">
                {lastResult.correct ? (
                  <>
                    <CheckCircle2 size={15} /> To'g'ri!
                  </>
                ) : (
                  <>
                    <XCircle size={15} /> Xato.
                  </>
                )}
              </div>
              <p className="mt-2 leading-5">
                To'g'ri javob:{" "}
                <strong className="text-ink">
                  {lastResult.correctAnswer}
                </strong>
              </p>
              <button
                type="button"
                onClick={next}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[12px] font-medium text-white hover:bg-[#333333]"
              >
                Keyingi so'z
              </button>
            </div>
          ) : easyMode ? (
            <div>
              {loadingOptions || !mcqOptions ? (
                <div className="flex min-h-[120px] items-center justify-center text-[12px] text-muted">
                  <Loader2 size={14} className="mr-2 animate-spin" />
                  Variantlar tayyorlanmoqda…
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {mcqOptions.map((option, idx) => (
                    <button
                      key={option}
                      type="button"
                      data-mcq-option={idx}
                      onClick={() => {
                        setInput(option);
                        void (async () => {
                          if (!pack || !current || sending) return;
                          setSending(true);
                          try {
                            const response = await fetch(
                              "/api/vocabulary/daily/answer",
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                credentials: "include",
                                body: JSON.stringify({
                                  language: pack.language,
                                  wordId: current.wordId,
                                  answer: option,
                                }),
                              },
                            );
                            const result = await response.json();
                            if (!response.ok || !result.success) {
                              throw new Error(result.message || "Xato");
                            }
                            setLastResult({
                              correct: !!result.correct,
                              correctAnswer: result.correctAnswer || "",
                            });
                            setData((prev) => {
                              if (!prev || !("pack" in prev)) return prev;
                              const newPack: Pack = {
                                ...prev.pack,
                                words: prev.pack.words.map((w, i) =>
                                  i === currentIndex
                                    ? {
                                        ...w,
                                        answered: true,
                                        correct: !!result.correct,
                                        userAnswer: option,
                                        translationUz: result.correctAnswer,
                                      }
                                    : w,
                                ),
                              };
                              return { ...prev, pack: newPack };
                            });
                            if (result.completed) await finish(pack.language);
                          } catch (err) {
                            setLastResult({
                              correct: false,
                              correctAnswer:
                                err instanceof Error
                                  ? err.message
                                  : "Noma'lum xato",
                            });
                          } finally {
                            setSending(false);
                          }
                        })();
                      }}
                      disabled={sending}
                      className="flex items-center justify-between rounded-md border border-rule bg-white px-4 py-3 text-left text-[14px] text-ink transition-colors hover:border-ink hover:bg-surface-2 disabled:opacity-60"
                    >
                      <span>{option}</span>
                      <span className="rounded border border-rule bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-ink-3">
                        {idx + 1}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="O'zbekcha tarjimasi…"
                className="h-11 w-full rounded-md border border-rule bg-white px-3 text-[14px] text-ink focus:border-ink focus:outline-none"
                maxLength={100}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="inline-flex h-11 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-medium text-white hover:bg-[#333333] disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Send size={14} />
                    Yuborish
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 flex items-center justify-between gap-2 border-t border-rule-soft pt-4">
            <button
              type="button"
              onClick={() => void finish(pack.language)}
              disabled={finishing}
              className="text-[11px] font-medium text-ink-3 underline underline-offset-2 hover:text-ink"
            >
              Pakni tugatish
            </button>
            <span className="text-[11px] text-muted">
              Qolgan: {remaining}
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-[#f5c2c0] bg-danger-bg p-5 text-[13px] text-danger">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5" />
            <span>
              {data && "message" in data
                ? data.message
                : "Pakni yuklab bo'lmadi"}
            </span>
          </div>
        </div>
      )}

      {/* 7-day score history */}
      {data && "history" in data && data.history && (
        (() => {
          const items = data.history[language] ?? [];
          if (items.length === 0) return null;
          return (
            <section className="mt-6 rounded-lg border border-rule bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-ink">
                  Oxirgi 7 ta pak natijasi
                </h3>
                <span className="text-[11px] text-muted">
                  {language === "english" ? "🇬🇧 English" : "🇩🇪 German"}
                </span>
              </div>
              <div className="flex items-end justify-between gap-2">
                {items.map((it) => {
                  const h = it.score != null ? Math.max(4, Math.round((it.score / 100) * 120)) : 0;
                  const perfect = it.score === 100;
                  return (
                    <div
                      key={it.date}
                      className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                      title={`${it.date}: ${it.correct}/${it.total} · ${it.score}%`}
                    >
                      <div className="flex h-[120px] w-full items-end justify-center">
                        {h > 0 ? (
                          <div
                            style={{ height: h }}
                            className={[
                              "w-7 rounded-md transition-all",
                              perfect
                                ? "bg-ok"
                                : it.score != null && it.score >= 80
                                  ? "bg-ink"
                                  : "bg-[#c9a86a]",
                            ].join(" ")}
                          />
                        ) : (
                          <div className="h-[2px] w-6 rounded-full bg-rule" />
                        )}
                      </div>
                      <span className="text-[10px] tabular-nums text-muted">
                        {it.date.slice(5)}
                      </span>
                      <span className="text-[10px] tabular-nums font-medium text-ink">
                        {it.score ?? "—"}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()
      )}

      {/* Progress snapshot */}
      {progress && (
        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          {(["english", "german"] as Language[]).map((lang) => {
            const p = progress[lang];
            return (
              <div
                key={lang}
                className="rounded-lg border border-rule bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-ink">
                    {lang === "english" ? "🇬🇧 English" : "🇩🇪 German"}
                  </span>
                  {p.unlocked ? (
                    <span className="rounded-sm bg-ok-bg px-1.5 py-0.5 text-[10px] font-medium text-ok">
                      Unlocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-sm bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-ink-3">
                      <Lock size={10} /> Locked
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-ink-3">
                  {p.packsCompleted} pak · {p.perfectPacks} ta 100%
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  Oxirgi: {p.lastPackScore ?? "—"}%
                  {p.lastPackDate ? ` (${p.lastPackDate})` : ""}
                </p>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
