import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Headphones,
  MessageSquareText,
  Mic,
  PenLine,
  Sparkles,
  Timer,
} from "lucide-react";

type Mode = {
  key: string;
  title: string;
  description: string;
  icon: typeof Mic;
  tag: string;
  status: "available" | "beta" | "soon";
  href?: string;
};

const MODES: Mode[] = [
  {
    key: "chat",
    title: "AI Chat Partner",
    description:
      "Ingliz yoki nemis tilida AI bilan yozma suhbat. Grammatika xatolari real vaqtda tuzatiladi.",
    icon: MessageSquareText,
    tag: "Writing · Reading",
    status: "available",
    href: "/dashboard/practice/chat",
  },
  {
    key: "speaking",
    title: "Speaking Drill",
    description:
      "Mikrofon orqali gapiring, AI fluency va grammar bo‘yicha baho beradi.",
    icon: Mic,
    tag: "Speaking",
    status: "available",
    href: "/dashboard/practice/speaking",
  },
  {
    key: "listening",
    title: "Listening Lab",
    description:
      "Qisqa audio parchalarni tinglang va comprehension savollariga javob bering.",
    icon: Headphones,
    tag: "Listening",
    status: "available",
    href: "/dashboard/practice/listening",
  },
  {
    key: "writing",
    title: "Guided Writing",
    description:
      "Berilgan mavzuda qisqa matn yozing, AI tuzatma va yangi so‘zlar taklif qiladi.",
    icon: PenLine,
    tag: "Writing",
    status: "available",
    href: "/dashboard/practice/writing",
  },
];

const LANGUAGES = [
  { id: "english", label: "English", flag: "🇬🇧" },
  { id: "german", label: "German", flag: "🇩🇪" },
] as const;

export default function PracticePage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-8 md:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center rounded-md border border-rule bg-surface-2 px-2 py-1 text-[11px] font-medium text-ink-3">
            AI Practice
          </span>
        </div>

        <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-ink md:text-[32px]">
          Practice with AI
        </h1>

        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-ink-3">
          Jonli AI mashqlar: suhbat, nutq, tinglash va yozish — hammasi tayyor.
        </p>
      </div>

      {/* Hero / CTA */}
      <div className="mb-10 overflow-hidden rounded-xl border border-rule bg-gradient-to-br from-[#fafafa] to-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-rule bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-2">
              <Sparkles size={11} />
              All 4 modes ready
            </div>

            <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">
              AI bilan suhbatlashishni boshlang
            </h2>

            <p className="mt-2 text-[13px] leading-6 text-ink-3">
              Darajangiz va maqsadingizga mos javoblar. Grammatika xatolari sizning tilingizda (o‘zbekcha) qisqa izoh bilan tuzatiladi.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <span
                  key={lang.id}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-rule bg-white px-2.5 text-[11px] font-medium text-ink-2"
                >
                  <span>{lang.flag}</span>
                  {lang.label}
                </span>
              ))}
            </div>
          </div>

          <Link
            href="/dashboard/practice/chat"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#333333]"
          >
            Start chatting
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* Modes */}
      <section>
        <h2 className="mb-4 text-[14px] font-semibold tracking-tight text-ink">
          Practice modes
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const available = mode.status === "available";

            const inner = (
              <>
                <div className="mb-4 flex items-start justify-between">
                  <div
                    className={[
                      "flex size-10 items-center justify-center rounded-lg border",
                      available
                        ? "border-rule bg-surface-2"
                        : "border-dashed border-rule bg-surface-2",
                    ].join(" ")}
                  >
                    <Icon
                      size={18}
                      strokeWidth={1.8}
                      className={
                        available
                          ? "text-ink"
                          : "text-muted"
                      }
                    />
                  </div>

                  {available ? (
                    <span className="inline-flex items-center rounded-sm bg-ok-bg px-1.5 py-0.5 text-[10px] font-medium text-ok">
                      Ready
                    </span>
                  ) : mode.status === "beta" ? (
                    <span className="inline-flex items-center rounded-sm bg-warn-bg px-1.5 py-0.5 text-[10px] font-medium text-warn">
                      Beta
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-sm bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium text-ink-3">
                      Coming soon
                    </span>
                  )}
                </div>

                <h3 className="text-[15px] font-semibold text-ink">
                  {mode.title}
                </h3>

                <p className="mt-1 flex-1 text-[12px] leading-5 text-ink-3">
                  {mode.description}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-rule-soft pt-3 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1">
                    <BrainCircuit size={12} />
                    {mode.tag}
                  </span>

                  <span className="inline-flex items-center gap-1">
                    <Timer size={12} />
                    {available ? "Start" : "Soon"}
                  </span>
                </div>
              </>
            );

            const classes = [
              "flex flex-col rounded-lg border bg-white p-5 transition-colors",
              available
                ? "border-rule hover:border-[#d4d4d4]"
                : "border-rule",
            ].join(" ");

            if (available && mode.href) {
              return (
                <Link key={mode.key} href={mode.href} className={classes}>
                  {inner}
                </Link>
              );
            }

            return (
              <article key={mode.key} className={classes}>
                {inner}
              </article>
            );
          })}
        </div>
      </section>

      {/* Note */}
      <section className="mt-10 rounded-lg border border-dashed border-rule bg-surface-2 p-5">
        <h3 className="text-[13px] font-semibold text-ink">
          Shu paytgacha nima qilish mumkin
        </h3>

        <ul className="mt-2 space-y-1.5 text-[12px] leading-5 text-ink-2">
          <li>
            · <Link href="/dashboard/practice/chat" className="underline underline-offset-2">AI Chat</Link> — EN/DE da yozma suhbat boshlang.
          </li>
          <li>
            · <Link href="/dashboard/planner" className="underline underline-offset-2">Planner</Link> — bugungi mashqlarni yakunlang.
          </li>
          <li>
            · <Link href="/dashboard/vocabulary" className="underline underline-offset-2">Vocabulary</Link> — kitob tanlab yangi so‘zlarni o‘rganing.
          </li>
          <li>
            · <Link href="/dashboard/analytics" className="underline underline-offset-2">Analytics</Link> — haftalik o‘sishni kuzating.
          </li>
        </ul>
      </section>
    </div>
  );
}
