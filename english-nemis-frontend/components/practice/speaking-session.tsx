"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Headphones,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  Sparkles,
  Volume2,
} from "lucide-react";

type Language = "english" | "german";

type Prompt = {
  id: string;
  language: Language;
  level: string;
  text: string;
  textUz: string;
};

const PROMPTS: Prompt[] = [
  {
    id: "en-intro",
    language: "english",
    level: "A2",
    text: "Introduce yourself in two or three sentences: name, where you live, and what you do.",
    textUz: "O‘zingizni 2–3 jumlada tanishtiring: ism, qayerda yashaysiz, nima qilasiz.",
  },
  {
    id: "en-weekend",
    language: "english",
    level: "B1",
    text: "Describe what you usually do on weekends and why.",
    textUz: "Dam olish kunlari odatda nima qilishingizni va nega buni yoqtirishingizni ayting.",
  },
  {
    id: "en-food",
    language: "english",
    level: "B1",
    text: "What is a food from your country a visitor should try? Explain how it is made.",
    textUz: "Mamlakatingizdan mehmon albatta tatib ko‘rishi kerak bo‘lgan taomni ayting va qanday tayyorlanishini tushuntiring.",
  },
  {
    id: "de-intro",
    language: "german",
    level: "A1",
    text: "Stelle dich kurz vor: Name, Wohnort und ein Hobby.",
    textUz: "Qisqa o‘zingizni tanishtiring: ism, yashash joyi va bitta sevimli mashg‘ulot.",
  },
  {
    id: "de-day",
    language: "german",
    level: "A2",
    text: "Erzähl von einem typischen Tag in deinem Leben. Was machst du am Morgen, am Nachmittag und am Abend?",
    textUz: "Hayotingizdagi tipik bir kun haqida gapiring: ertalab, kunduzi va kechqurun nimalar qilasiz?",
  },
];

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string; isFinal?: boolean }>> }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type Mistake = {
  heard: string;
  shouldBe: string;
  reasonUz: string;
};

type Feedback = {
  fluencyScore: number;
  grammarScore: number;
  relevanceScore: number;
  overallUz: string;
  mistakes: Mistake[];
  idealAnswer: string;
  nextTipUz: string;
};

type Props = {
  englishLevel: string;
  germanLevel: string;
};

export function SpeakingSession({ englishLevel, germanLevel }: Props) {
  const [language, setLanguage] = useState<Language>("english");
  const [promptIndex, setPromptIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState<boolean | null>(null);
  const [startedAt] = useState(() => Date.now());
  const sessionLoggedRef = useRef(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const prompts = PROMPTS.filter((p) => p.language === language);
  const prompt = prompts[promptIndex] || prompts[0];
  const level = language === "english" ? englishLevel : germanLevel;

  // Check browser support
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    setSupported(Boolean(Rec));
  }, []);

  // Reset on language/prompt change
  useEffect(() => {
    stopListening();
    setTranscript("");
    setInterim("");
    setFeedback(null);
    setError("");
  }, [language, promptIndex]);

  useEffect(() => {
    return () => stopListening();
  }, []);

  function stopListening() {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }

  function startListening() {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Rec) {
      setError("Brauzer SpeechRecognition'ni qo‘llab-quvvatlamaydi.");
      return;
    }

    const rec = new Rec();
    rec.lang = language === "german" ? "de-DE" : "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        const alt = res[0];
        if (alt?.isFinal) {
          finalText += alt.transcript + " ";
        } else if (alt) {
          interimText += alt.transcript;
        }
      }
      if (finalText) {
        setTranscript((prev) => (prev + " " + finalText).trim());
      }
      setInterim(interimText);
    };

    rec.onerror = (ev) => {
      const err = ev as { error?: string };
      setError(
        err.error === "not-allowed"
          ? "Mikrofon ruxsat berilmagan."
          : `Nutqni tanib bo‘lmadi (${err.error ?? "noma'lum"})`,
      );
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    recognitionRef.current = rec;
    setError("");
    try {
      rec.start();
      setListening(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Boshlab bo‘lmadi");
      setListening(false);
    }
  }

  async function evaluate() {
    const t = transcript.trim();
    if (!t || loading) return;

    stopListening();
    setLoading(true);
    setError("");
    setFeedback(null);

    try {
      const response = await fetch("/api/practice/speaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          language,
          prompt: prompt.text,
          transcript: t,
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
            activity: "speaking",
            durationMinutes: Math.min(minutes, 30),
          }),
          keepalive: true,
        }).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noma'lum xatolik");
    } finally {
      setLoading(false);
    }
  }

  function playIdeal() {
    if (!feedback?.idealAnswer || typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(feedback.idealAnswer);
    u.lang = language === "german" ? "de-DE" : "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  function resetAttempt() {
    stopListening();
    setTranscript("");
    setInterim("");
    setFeedback(null);
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
            Speaking Drill
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
                  setPromptIndex(0);
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

      {supported === false && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-[#f5c2c0] bg-danger-bg p-3 text-[12px] text-danger">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>
            Brauzer SpeechRecognition'ni qo‘llab-quvvatlamaydi. Chrome yoki Edge sinab ko‘ring, yoki transkiriptni qo‘lda yozing.
          </span>
        </div>
      )}

      {/* Prompt */}
      <div className="rounded-lg border border-rule bg-white p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-surface-2 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.05em] text-ink-2">
            {prompt.level}
          </span>

          <div className="flex gap-2">
            {prompts.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPromptIndex(i)}
                className={[
                  "size-5 rounded-full text-[10px] font-semibold transition-colors",
                  i === promptIndex
                    ? "bg-ink text-white"
                    : "bg-surface-3 text-ink-3 hover:bg-rule",
                ].join(" ")}
                aria-label={`Prompt ${i + 1}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[15px] leading-6 text-ink">
          {prompt.text}
        </p>
        <p className="mt-2 text-[12px] leading-5 text-ink-3">
          {prompt.textUz}
        </p>
      </div>

      {/* Mic + transcript */}
      <div className="mt-5 rounded-lg border border-rule bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              disabled={supported === false || loading}
              className={[
                "inline-flex size-12 items-center justify-center rounded-full transition-colors disabled:opacity-50",
                listening
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-ink text-white hover:bg-[#333333]",
              ].join(" ")}
              aria-label={listening ? "Stop" : "Start recording"}
            >
              {listening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <div>
              <p className="text-[12px] font-medium text-ink">
                {listening ? "Yozib olinyapti…" : "Boshlash uchun bosing"}
              </p>
              <p className="text-[11px] text-muted">
                {language === "english" ? "en-US" : "de-DE"} ·
                {" "}SpeechRecognition
              </p>
            </div>
          </div>

          {transcript && (
            <button
              type="button"
              onClick={resetAttempt}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rule bg-white px-2.5 text-[11px] font-medium text-ink-2 hover:border-[#d4d4d4] hover:text-ink"
            >
              <RefreshCw size={12} />
              Qayta
            </button>
          )}
        </div>

        <div className="mt-4 min-h-[80px] rounded-md border border-rule bg-surface-2 p-3">
          {transcript || interim ? (
            <p className="text-[13px] leading-6 text-ink">
              {transcript}
              {interim && (
                <span className="text-muted"> {interim}</span>
              )}
            </p>
          ) : (
            <p className="text-[12px] text-muted">
              {language === "english"
                ? "Your transcript will appear here as you speak…"
                : "Dein Transkript erscheint hier beim Sprechen…"}
            </p>
          )}
        </div>

        {supported === false && (
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Transkriptni qo‘lda yozing"
            rows={3}
            className="mt-3 w-full resize-y rounded-md border border-rule bg-white px-3 py-2 text-[13px] leading-6 text-ink focus:border-ink focus:outline-none"
          />
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-[#f5c2c0] bg-danger-bg p-3 text-[12px] text-danger">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={evaluate}
            disabled={!transcript.trim() || loading}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#333333] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Baholanmoqda…
              </>
            ) : (
              <>
                <Sparkles size={13} />
                AI baho so‘rash
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <section className="mt-6 space-y-4">
          <div className="rounded-lg border border-rule bg-white p-5">
            <h2 className="mb-4 text-[14px] font-semibold text-ink">
              Baho
            </h2>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Fluency", value: feedback.fluencyScore },
                { label: "Grammar", value: feedback.grammarScore },
                { label: "Relevance", value: feedback.relevanceScore },
              ].map((row) => (
                <div
                  key={row.label}
                  className="rounded-md border border-rule bg-surface-2 p-3"
                >
                  <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-muted">
                    {row.label}
                  </p>
                  <p className="mt-1 text-[22px] font-semibold tabular-nums text-ink">
                    {row.value}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-[13px] leading-6 text-ink">
              {feedback.overallUz}
            </p>
          </div>

          {feedback.mistakes?.length > 0 && (
            <div className="rounded-lg border border-rule bg-white p-5">
              <h2 className="mb-3 text-[14px] font-semibold text-ink">
                Xatolar
              </h2>
              <ul className="space-y-3">
                {feedback.mistakes.map((m, i) => (
                  <li
                    key={i}
                    className="rounded-md border border-rule bg-surface-2 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[12px]">
                      <span className="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700 line-through">
                        {m.heard}
                      </span>
                      <span className="text-muted">→</span>
                      <span className="rounded bg-green-100 px-1.5 py-0.5 font-medium text-green-800">
                        {m.shouldBe}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-ink-3">
                      {m.reasonUz}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-rule bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                <Headphones size={14} className="text-ink" />
                Ideal javob
              </h2>
              <button
                type="button"
                onClick={playIdeal}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rule bg-white px-2.5 text-[11px] font-medium text-ink-2 hover:border-[#d4d4d4] hover:text-ink"
              >
                <Volume2 size={12} />
                Eshitish
              </button>
            </div>
            <p className="text-[13px] leading-6 text-ink">
              {feedback.idealAnswer}
            </p>
          </div>

          <div className="rounded-md border border-dashed border-rule bg-surface-2 p-3 text-[12px] leading-5 text-ink-2">
            <strong className="text-ink">Keyingi qadam:</strong>{" "}
            {feedback.nextTipUz}
          </div>
        </section>
      )}
    </div>
  );
}
