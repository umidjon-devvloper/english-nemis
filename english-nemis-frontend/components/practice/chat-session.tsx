"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";

type Language = "english" | "german";
type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
};

type ConversationSummary = {
  id: string;
  language: Language;
  title: string;
  lastMessageAt: string;
  messageCount: number;
};

type Props = {
  englishLevel: string;
  germanLevel: string;
};

const LANGUAGE_META: Record<
  Language,
  {
    label: string;
    flag: string;
    greeting: string;
    placeholder: string;
    starters: string[];
  }
> = {
  english: {
    label: "English",
    flag: "🇬🇧",
    greeting:
      "Hi! I'm your English practice partner. What would you like to talk about today?",
    placeholder: "Type in English…",
    starters: [
      "Tell me about your weekend",
      "Help me order coffee",
      "What is small talk?",
    ],
  },
  german: {
    label: "German",
    flag: "🇩🇪",
    greeting:
      "Hallo! Ich bin dein Deutsch-Partner. Worüber möchtest du heute sprechen?",
    placeholder: "Auf Deutsch schreiben…",
    starters: [
      "Erzähl mir vom Wochenende",
      "Hilf mir einen Kaffee zu bestellen",
      "Was ist Small Talk?",
    ],
  },
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function formatRelative(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function ChatSession({ englishLevel, germanLevel }: Props) {
  const [language, setLanguage] = useState<Language>("english");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sessionStartedAt] = useState(() => Date.now());
  const [sessionLogged, setSessionLogged] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);

  const level =
    language === "english" ? englishLevel : germanLevel;
  const meta = LANGUAGE_META[language];

  // Load conversations list
  useEffect(() => {
    void refreshConversations(language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Scroll to bottom
  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  // Log session on unmount if meaningful
  useEffect(() => {
    return () => {
      if (sessionLogged) return;
      const assistantReplies = messages.filter(
        (m) => m.role === "assistant",
      ).length;
      if (assistantReplies < 2) return;

      const minutes = Math.max(
        1,
        Math.round((Date.now() - sessionStartedAt) / 60000),
      );

      fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          language,
          activity: "practice",
          durationMinutes: Math.min(minutes, 90),
        }),
        keepalive: true,
      }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshConversations(lang: Language) {
    try {
      const response = await fetch(
        `/api/practice/conversations?language=${lang}`,
        { cache: "no-store", credentials: "include" },
      );
      if (!response.ok) return;
      const data = await response.json();
      setConversations(data.conversations ?? []);
    } catch {
      // non-blocking
    }
  }

  async function loadConversation(id: string) {
    setError("");
    setSidebarOpen(false);

    try {
      const response = await fetch(
        `/api/practice/conversations/${id}`,
        { cache: "no-store", credentials: "include" },
      );
      if (!response.ok) throw new Error("Load failed");
      const data = await response.json();
      const conv = data.conversation;
      setLanguage(conv.language);
      setConversationId(conv.id);
      setMessages(
        conv.messages.map((m: { id?: string; role: Role; content: string }) => ({
          id: m.id ?? uid(),
          role: m.role,
          content: m.content,
        })),
      );
    } catch {
      setError("Suhbatni yuklab bo‘lmadi");
    }
  }

  function newConversation() {
    setConversationId(null);
    setMessages([]);
    setError("");
    setSidebarOpen(false);
  }

  async function deleteConversation(id: string) {
    try {
      await fetch(`/api/practice/conversations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (id === conversationId) newConversation();
      void refreshConversations(language);
    } catch {
      // non-blocking
    }
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;

    const userMsg: ChatMessage = { id: uid(), role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setError("");

    const assistantId = uid();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("/api/practice/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          language,
          conversationId: conversationId ?? undefined,
          message: content,
        }),
      });

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "AI javob bermadi");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";
      let newConvId: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const raw of events) {
          const lines = raw.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event: "));
          const dataLine = lines.find((l) => l.startsWith("data: "));
          if (!eventLine || !dataLine) continue;

          const name = eventLine.slice(7).trim();
          let payload: Record<string, unknown> = {};
          try {
            payload = JSON.parse(dataLine.slice(6));
          } catch {
            continue;
          }

          if (name === "meta") {
            if (typeof payload.conversationId === "string") {
              newConvId = payload.conversationId;
              setConversationId(newConvId);
            }
          } else if (name === "delta") {
            const chunk =
              typeof payload.text === "string" ? payload.text : "";
            if (chunk) {
              full += chunk;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: full } : m,
                ),
              );
            }
          } else if (name === "done") {
            // final write — content already up-to-date
          } else if (name === "error") {
            throw new Error(
              typeof payload.message === "string"
                ? payload.message
                : "AI xatosi",
            );
          }
        }
      }

      if (!full) {
        throw new Error("AI bo‘sh javob qaytardi");
      }

      void refreshConversations(language);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noma'lum xatolik");
      // Remove the empty assistant placeholder on error
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void send(input);
  }

  const empty = messages.length === 0;

  return (
    <div className="relative mx-auto flex h-full w-full max-w-5xl px-5 py-6 md:px-8">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close conversations"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-10 bg-black/30 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "mr-4 w-64 shrink-0 flex-col overflow-hidden rounded-lg border border-rule bg-white lg:flex",
          sidebarOpen
            ? "fixed inset-y-4 left-4 z-20 flex max-w-[88vw] shadow-2xl lg:static lg:inset-auto lg:z-auto lg:shadow-none"
            : "hidden",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-rule p-3">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-3">
            Suhbatlar
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={newConversation}
              aria-label="New conversation"
              className="inline-flex size-7 items-center justify-center rounded-md border border-rule text-ink-2 hover:border-[#d4d4d4] hover:text-ink"
            >
              <Plus size={14} />
            </button>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close"
              className="inline-flex size-7 items-center justify-center rounded-md border border-transparent text-ink-3 hover:bg-surface-2 hover:text-ink lg:hidden"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="px-2 py-3 text-[11px] text-muted">
              Hali suhbat yo‘q.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((c) => {
                const active = c.id === conversationId;
                return (
                  <li key={c.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => void loadConversation(c.id)}
                      className={[
                        "flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors",
                        active
                          ? "bg-[#f3f3f3]"
                          : "hover:bg-surface-2",
                      ].join(" ")}
                    >
                      <span className="truncate text-[12px] font-medium text-ink">
                        {c.title}
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] text-muted">
                        <MessageSquare size={9} />
                        {c.messageCount} · {formatRelative(c.lastMessageAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteConversation(c.id)}
                      aria-label="Delete"
                      className="absolute right-1 top-1.5 hidden size-6 items-center justify-center rounded text-muted hover:bg-white hover:text-red-600 group-hover:flex"
                    >
                      <Trash2 size={11} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
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
              AI Chat Partner
            </h1>

            <p className="mt-1 text-[12px] text-ink-3">
              {meta.label} · Level {level}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rule bg-white px-2.5 text-xs font-medium text-ink-2 hover:border-[#d4d4d4] hover:text-ink lg:hidden"
            >
              <MessageSquare size={13} />
              Suhbatlar
            </button>

            <div
              role="tablist"
              aria-label="Chat language"
              className="inline-flex items-center rounded-md border border-rule bg-surface-2 p-0.5"
            >
              {(Object.keys(LANGUAGE_META) as Language[]).map((lang) => {
                const active = lang === language;
                const info = LANGUAGE_META[lang];
                return (
                  <button
                    key={lang}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      if (lang === language) return;
                      setLanguage(lang);
                      newConversation();
                    }}
                    className={[
                      "inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                        : "text-[#666666] hover:text-ink",
                    ].join(" ")}
                  >
                    <span aria-hidden="true">{info.flag}</span>
                    {info.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chat scroller */}
        <div
          ref={scrollerRef}
          className="relative mb-3 flex-1 overflow-y-auto rounded-lg border border-rule bg-white"
        >
          {empty ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 py-10 text-center">
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-rule bg-surface-2">
                <Sparkles size={18} className="text-ink" />
              </div>

              <h2 className="text-[14px] font-semibold text-ink">
                {meta.greeting}
              </h2>

              <p className="mt-2 text-[12px] text-ink-3">
                Pastdagi variantlardan birini tanlang yoki o‘zingiz yozing.
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {meta.starters.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => void send(starter)}
                    className="inline-flex h-8 items-center rounded-md border border-rule bg-white px-3 text-[12px] font-medium text-ink-2 transition-colors hover:border-[#d4d4d4] hover:text-ink"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 px-5 py-6">
              {messages.map((m, idx) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  streaming={
                    sending &&
                    m.role === "assistant" &&
                    idx === messages.length - 1
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-[#f5c2c0] bg-danger-bg p-3 text-[12px] text-danger">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Composer */}
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 rounded-lg border border-rule bg-white p-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder={meta.placeholder}
            rows={1}
            maxLength={2000}
            disabled={sending}
            className="min-h-[36px] max-h-40 w-full resize-none bg-transparent px-2 py-2 text-[13px] text-ink placeholder:text-muted focus:outline-none"
          />

          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-ink text-white transition-colors hover:bg-[#333333] disabled:opacity-40"
            aria-label="Send"
          >
            {sending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </form>

        {/* Save session hint */}
        {messages.filter((m) => m.role === "assistant").length >= 2 &&
          !sessionLogged && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-dashed border-rule bg-surface-2 px-3 py-2 text-[11px] text-ink-3">
              <span className="inline-flex items-center gap-1.5">
                <BookOpen size={12} />
                Suhbat avtomatik saqlangan · sessiya analytics’ga qo‘shiladi
              </span>

              <button
                type="button"
                onClick={() => {
                  const assistantReplies = messages.filter(
                    (m) => m.role === "assistant",
                  ).length;
                  if (assistantReplies === 0) return;
                  const minutes = Math.max(
                    1,
                    Math.round(
                      (Date.now() - sessionStartedAt) / 60000,
                    ),
                  );
                  fetch("/api/sessions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      language,
                      activity: "practice",
                      durationMinutes: Math.min(minutes, 90),
                    }),
                  })
                    .then(() => setSessionLogged(true))
                    .catch(() => {});
                }}
                className="text-[11px] font-medium text-ink underline underline-offset-2"
              >
                Hozir saqlash
              </button>
            </div>
          )}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  streaming,
}: {
  message: ChatMessage;
  streaming?: boolean;
}) {
  const isUser = message.role === "user";
  const lines = message.content.split("\n");

  return (
    <div
      className={[
        "flex",
        isUser ? "justify-end" : "justify-start",
      ].join(" ")}
    >
      <div
        className={[
          "max-w-[85%] rounded-xl px-4 py-3 text-[13px] leading-6",
          isUser
            ? "bg-ink text-white"
            : "bg-surface-2 text-ink",
        ].join(" ")}
      >
        {message.content === "" && streaming ? (
          <span className="inline-flex items-center gap-2 text-[12px] text-muted">
            <Loader2 size={13} className="animate-spin" />
            Thinking…
          </span>
        ) : (
          <>
            {lines.map((line, i) => {
              const isTip =
                !isUser && /^(Tip|Tipp)\s*\(/i.test(line.trim());

              return (
                <p
                  key={i}
                  className={[
                    i > 0 ? "mt-2" : "",
                    isTip
                      ? "border-t border-rule pt-2 text-[12px] text-warn"
                      : "",
                  ].join(" ")}
                >
                  {line}
                  {streaming && i === lines.length - 1 && (
                    <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-ink-2 align-middle" />
                  )}
                </p>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
