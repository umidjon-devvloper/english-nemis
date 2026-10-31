"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Headphones,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react";

type Language = "english" | "german";

type Question = {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
  explanationUz: string;
};

type Clip = {
  id: string;
  language: Language;
  level: string;
  title: string;
  passage: string;
  translationUz: string;
  questions: Question[];
};

const CLIPS: Clip[] = [
  {
    id: "en-coffee",
    language: "english",
    level: "A2",
    title: "Ordering coffee",
    passage:
      "Hi, I'd like a medium cappuccino, please. Could you make it with oat milk? And one chocolate muffin to go. How much is that together?",
    translationUz:
      "Salom, menga o‘rta kappuchino bering, iltimos. Suli sutida tayyorlab bera olasizmi? Va bitta shokoladli maffin olib ketish uchun. Hammasi qancha bo‘ladi?",
    questions: [
      {
        id: "q1",
        prompt: "What size of coffee does the customer want?",
        options: ["Small", "Medium", "Large"],
        answer: "Medium",
        explanationUz: "«a medium cappuccino» — o‘rta hajm.",
      },
      {
        id: "q2",
        prompt: "What type of milk does the customer ask for?",
        options: ["Soy milk", "Oat milk", "Almond milk"],
        answer: "Oat milk",
        explanationUz: "«with oat milk» — suli suti.",
      },
      {
        id: "q3",
        prompt: "Is the muffin for here or to go?",
        options: ["For here", "To go", "Not mentioned"],
        answer: "To go",
        explanationUz: "«to go» — olib ketish uchun.",
      },
    ],
  },
  {
    id: "en-plans",
    language: "english",
    level: "B1",
    title: "Weekend plans",
    passage:
      "I'm going to the mountains on Saturday with two friends. We leave early in the morning, around six, so we can hike before it gets hot. On Sunday I'll stay home and rest.",
    translationUz:
      "Shanba kuni men ikki do‘stim bilan tog‘larga boraman. Ertalab erta, taxminan oltida, chiqamiz, shunda issiq bo‘lishdan oldin yurib olishimiz mumkin. Yakshanbada uyda qolib dam olaman.",
    questions: [
      {
        id: "q1",
        prompt: "Who is going to the mountains?",
        options: ["The speaker alone", "The speaker and one friend", "The speaker and two friends"],
        answer: "The speaker and two friends",
        explanationUz: "«with two friends» — ikki do‘sti bilan.",
      },
      {
        id: "q2",
        prompt: "At what time do they leave?",
        options: ["Around six", "Around eight", "At noon"],
        answer: "Around six",
        explanationUz: "«around six» — taxminan 6:00.",
      },
      {
        id: "q3",
        prompt: "What is the plan for Sunday?",
        options: ["Hike again", "Visit family", "Stay home and rest"],
        answer: "Stay home and rest",
        explanationUz: "«stay home and rest» — uyda qolib dam olish.",
      },
    ],
  },
  {
    id: "de-breakfast",
    language: "german",
    level: "A1",
    title: "Mein Frühstück",
    passage:
      "Am Morgen esse ich Brot mit Käse und trinke eine Tasse Kaffee mit Milch. Manchmal esse ich auch einen Apfel. Ich habe immer um sieben Uhr Frühstück.",
    translationUz:
      "Ertalab men nonni pishloq bilan yeyman va bir chashka sutli qahva ichaman. Ba'zan olma ham yeyman. Nonushtani doim soat yettida qilaman.",
    questions: [
      {
        id: "q1",
        prompt: "Was isst der Sprecher am Morgen?",
        options: ["Brot mit Käse", "Fisch", "Suppe"],
        answer: "Brot mit Käse",
        explanationUz: "«Brot mit Käse» — pishloqli non.",
      },
      {
        id: "q2",
        prompt: "Was trinkt er?",
        options: ["Tee ohne Milch", "Kaffee mit Milch", "Wasser"],
        answer: "Kaffee mit Milch",
        explanationUz: "«Kaffee mit Milch» — sutli qahva.",
      },
      {
        id: "q3",
        prompt: "Wann frühstückt er?",
        options: ["Um sechs Uhr", "Um sieben Uhr", "Um neun Uhr"],
        answer: "Um sieben Uhr",
        explanationUz: "«um sieben Uhr» — soat yettida.",
      },
    ],
  },
  {
    id: "de-weekend",
    language: "german",
    level: "A2",
    title: "Am Wochenende",
    passage:
      "Am Samstag gehe ich mit meinen Freunden ins Kino. Danach essen wir Pizza in einem Restaurant in der Stadt. Am Sonntag bleibe ich zu Hause und lese ein Buch.",
    translationUz:
      "Shanba kuni men do‘stlarim bilan kinoga boraman. Keyin biz shahardagi restoranda pitsa yeymiz. Yakshanba uyda qolib kitob o‘qiyman.",
    questions: [
      {
        id: "q1",
        prompt: "Was macht der Sprecher am Samstag zuerst?",
        options: ["Er bleibt zu Hause", "Er geht ins Kino", "Er geht in die Berge"],
        answer: "Er geht ins Kino",
        explanationUz: "«ins Kino» — kinoga.",
      },
      {
        id: "q2",
        prompt: "Was essen sie danach?",
        options: ["Pizza", "Suppe", "Nudeln"],
        answer: "Pizza",
        explanationUz: "«Pizza in einem Restaurant».",
      },
      {
        id: "q3",
        prompt: "Was macht er am Sonntag?",
        options: ["Fußball spielen", "Zu Hause lesen", "Mit Freunden essen"],
        answer: "Zu Hause lesen",
        explanationUz: "«zu Hause bleiben und lesen».",
      },
    ],
  },
];

type Props = {
  englishLevel: string;
  germanLevel: string;
};

export function ListeningSession({ englishLevel, germanLevel }: Props) {
  const [language, setLanguage] = useState<Language>("english");
  const [clipIndex, setClipIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [sessionLogged, setSessionLogged] = useState(false);
  const [startedAt] = useState(() => Date.now());

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const clips = CLIPS.filter((c) => c.language === language);
  const clip = clips[clipIndex] || clips[0];
  const level = language === "english" ? englishLevel : germanLevel;

  // Reset when switching language or clip
  useEffect(() => {
    stopSpeech();
    setPlaying(false);
    setPlayCount(0);
    setShowTranscript(false);
    setAnswers({});
    setSubmitted(false);
  }, [language, clipIndex]);

  // Clean up TTS on unmount
  useEffect(() => {
    return () => stopSpeech();
  }, []);

  function stopSpeech() {
    if (typeof window === "undefined") return;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
  }

  function playClip() {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) {
      alert("Brauzer TTS'ni qo‘llab-quvvatlamaydi.");
      return;
    }

    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(clip.passage);
    utterance.lang = language === "german" ? "de-DE" : "en-US";
    utterance.rate = 0.9;
    utterance.onend = () => {
      setPlaying(false);
      setPlayCount((n) => n + 1);
    };
    utterance.onerror = () => setPlaying(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
  }

  function togglePlay() {
    if (playing) {
      stopSpeech();
      setPlaying(false);
    } else {
      playClip();
    }
  }

  function selectAnswer(qid: string, value: string) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  function submit() {
    if (submitted) return;
    setSubmitted(true);

    if (sessionLogged) return;

    const minutes = Math.max(
      1,
      Math.round((Date.now() - startedAt) / 60000),
    );

    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        language,
        activity: "listening",
        durationMinutes: Math.min(minutes, 30),
        correctAnswers: clip.questions.filter(
          (q) => answers[q.id] === q.answer,
        ).length,
        totalAnswers: clip.questions.length,
      }),
      keepalive: true,
    })
      .then(() => setSessionLogged(true))
      .catch(() => {});
  }

  const allAnswered = clip.questions.every(
    (q) => answers[q.id] !== undefined,
  );

  const correctCount = clip.questions.filter(
    (q) => answers[q.id] === q.answer,
  ).length;

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
            Listening Lab
          </h1>

          <p className="mt-1 text-[12px] text-ink-3">
            {language === "english" ? "English" : "German"} · Level {level}
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
                onClick={() => {
                  if (lang === language) return;
                  setLanguage(lang);
                  setClipIndex(0);
                }}
                className={[
                  "inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                    : "text-[#666666] hover:text-ink",
                ].join(" ")}
              >
                <span>{lang === "english" ? "🇬🇧" : "🇩🇪"}</span>
                {lang === "english" ? "English" : "German"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Clip picker */}
      <div className="mb-4 flex flex-wrap gap-2">
        {clips.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setClipIndex(i)}
            className={[
              "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors",
              i === clipIndex
                ? "border-ink bg-ink text-white"
                : "border-rule bg-white text-ink-2 hover:border-[#d4d4d4]",
            ].join(" ")}
          >
            <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 text-[9px] font-semibold text-ink-3">
              {c.level}
            </span>
            {c.title}
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
              Clip {clipIndex + 1} / {clips.length} · {clip.level}
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

        <p className="text-[11px] text-ink-3">
          Audio {playCount} marta eshitildi · brauzer TTS orqali
        </p>

        {/* Show transcript */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="text-[11px] font-medium text-ink-2 underline underline-offset-2 hover:text-ink"
          >
            {showTranscript ? "Matnni yashirish" : "Matnni ko‘rsatish"}
          </button>

          {showTranscript && (
            <div className="mt-3 rounded-md border border-rule bg-surface-2 p-3">
              <p className="whitespace-pre-line text-[13px] leading-6 text-ink">
                {clip.passage}
              </p>
              <p className="mt-3 border-t border-rule pt-3 text-[12px] leading-5 text-ink-3">
                {clip.translationUz}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Questions */}
      <section className="mt-5 space-y-3">
        {clip.questions.map((q, qi) => {
          const selected = answers[q.id];
          const correct = selected === q.answer;

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
                  const isCorrect = submitted && opt === q.answer;
                  const isWrong = submitted && isSelected && !correct;

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => selectAnswer(q.id, opt)}
                      disabled={submitted}
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
                      {submitted && isCorrect && <CheckCircle2 size={13} />}
                      {submitted && isWrong && <XCircle size={13} />}
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <p className="mt-2 text-[11px] leading-5 text-ink-3">
                  {q.explanationUz}
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* Actions */}
      <div className="mt-5 flex items-center justify-between gap-3">
        {submitted ? (
          <>
            <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <Sparkles size={14} />
              Natija: {correctCount} / {clip.questions.length}
            </div>
            <button
              type="button"
              onClick={() => {
                setClipIndex(
                  (i) => (i + 1) % Math.max(1, clips.length),
                );
              }}
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
            disabled={!allAnswered}
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#333333] disabled:opacity-50"
          >
            <CheckCircle2 size={13} />
            Tekshirish
          </button>
        )}
      </div>
    </div>
  );
}
