import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Headphones,
  Languages,
  Mic,
  PenLine,
  Sparkles,
} from "lucide-react";

import { getCurrentUser } from "../../lib/auth/session";

type SkillStatus = "available" | "soon";

type Skill = {
  title: string;
  description: string;
  icon: typeof BookOpen;
  status: SkillStatus;
  href?: string;
};

const ENGLISH_SKILLS: Skill[] = [
  {
    title: "Vocabulary",
    description:
      "Essential English kitoblaridan birini tanlab, so‘z boyligingizni oshiring.",
    icon: BookOpen,
    status: "available",
    href: "/dashboard/vocabulary",
  },
  {
    title: "Daily Grammar",
    description:
      "AI tomonidan har kuni tayyorlanadigan grammatika mashqlari.",
    icon: PenLine,
    status: "available",
    href: "/dashboard/planner",
  },
  {
    title: "Listening",
    description:
      "Audio parchalar va tushunish savollari — tez orada.",
    icon: Headphones,
    status: "soon",
  },
  {
    title: "Speaking Practice",
    description:
      "AI bilan jonli muloqot va talaffuz baholash.",
    icon: Mic,
    status: "soon",
  },
];

const GERMAN_SKILLS: Skill[] = [
  {
    title: "Grundwortschatz",
    description:
      "Nemis tilining asosiy so‘z boyligi — der/die/das va ko‘plik bilan.",
    icon: BookOpen,
    status: "soon",
    href: "/dashboard/vocabulary",
  },
  {
    title: "Daily Grammar",
    description:
      "AI tayyorlagan nemis grammatikasi mashqlari.",
    icon: PenLine,
    status: "available",
    href: "/dashboard/planner",
  },
  {
    title: "Listening",
    description: "Hörverstehen — tez orada.",
    icon: Headphones,
    status: "soon",
  },
  {
    title: "Speaking Practice",
    description: "Sprechen — tez orada.",
    icon: Mic,
    status: "soon",
  },
];

type LessonTrack = {
  id: "english" | "german";
  label: string;
  flag: string;
  level: string;
  summary: string;
  skills: Skill[];
};

export default async function LessonsPage() {
  const user = await getCurrentUser();

  const tracks: LessonTrack[] = [
    {
      id: "english",
      label: "English",
      flag: "🇬🇧",
      level: user?.englishLevelEstimate || "Not assessed",
      summary:
        "Umumiy ingliz tili yo‘nalishi: vocabulary, grammar, reading va writing.",
      skills: ENGLISH_SKILLS,
    },
    {
      id: "german",
      label: "German",
      flag: "🇩🇪",
      level: user?.germanLevelEstimate || "A0",
      summary:
        "Noldan boshlab nemis tili: grundwortschatz, A1 grammatikasi, kundalik ifodalar.",
      skills: GERMAN_SKILLS,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-8 md:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center rounded-md border border-rule bg-surface-2 px-2 py-1 text-[11px] font-medium text-ink-3">
            Learning Paths
          </span>
        </div>

        <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-ink md:text-[32px]">
          My Lessons
        </h1>

        <p className="mt-2 text-[13px] text-ink-3">
          Ingliz va nemis tillari bo‘yicha o‘quv yo‘nalishlari.
          Har bir ko‘nikma uchun alohida mashqlar.
        </p>
      </div>

      {/* Today snapshot */}
      <div className="mb-8 rounded-lg border border-rule bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-rule bg-surface-2">
              <Sparkles size={17} className="text-ink" />
            </div>

            <div>
              <h2 className="text-[14px] font-semibold text-ink">
                Bugungi reja tayyor
              </h2>

              <p className="mt-1 text-[12px] leading-5 text-ink-3">
                AI har kuni ertalab sizning darajangiz va
                maqsadlaringiz asosida mashqlar tayyorlaydi.
                Planner orqali boshlang.
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/planner"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-ink px-3.5 text-[12px] font-medium text-white transition-colors hover:bg-[#333333]"
          >
            Open Planner
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Language tracks */}
      <div className="grid gap-6 lg:grid-cols-2">
        {tracks.map((track) => (
          <section
            key={track.id}
            className="overflow-hidden rounded-lg border border-rule bg-white"
          >
            {/* Track header */}
            <div className="border-b border-rule-soft p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-surface-3 text-xl">
                    {track.flag}
                  </div>

                  <div>
                    <h2 className="text-[16px] font-semibold text-ink">
                      {track.label}
                    </h2>

                    <p className="mt-0.5 text-[11px] text-muted">
                      Current level: {track.level}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 rounded-md border border-rule bg-surface-2 px-2 py-1 text-[11px] font-medium text-ink-2">
                  <Languages size={12} />
                  {
                    track.skills.filter(
                      (s) => s.status === "available",
                    ).length
                  }
                  /{track.skills.length} ready
                </span>
              </div>

              <p className="mt-3 text-[12px] leading-5 text-ink-3">
                {track.summary}
              </p>
            </div>

            {/* Skills list */}
            <ul className="divide-y divide-rule-soft">
              {track.skills.map((skill) => {
                const Icon = skill.icon;
                const available = skill.status === "available";

                const Row = (
                  <div className="flex items-start gap-3 p-4">
                    <div
                      className={[
                        "flex size-9 shrink-0 items-center justify-center rounded-md border",
                        available
                          ? "border-rule bg-white"
                          : "border-dashed border-rule bg-surface-2",
                      ].join(" ")}
                    >
                      <Icon
                        size={16}
                        strokeWidth={1.8}
                        className={
                          available
                            ? "text-ink"
                            : "text-muted"
                        }
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium text-ink">
                          {skill.title}
                        </p>

                        {available ? (
                          <span className="inline-flex items-center gap-1 rounded-sm bg-ok-bg px-1.5 py-0.5 text-[10px] font-medium text-ok">
                            <CheckCircle2 size={10} />
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-sm bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted">
                            Soon
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-[12px] leading-5 text-ink-3">
                        {skill.description}
                      </p>
                    </div>

                    {available && skill.href && (
                      <ArrowUpRight
                        size={15}
                        className="mt-1 shrink-0 text-muted group-hover:text-black"
                      />
                    )}
                  </div>
                );

                if (available && skill.href) {
                  return (
                    <li key={skill.title}>
                      <Link
                        href={skill.href}
                        className="group block transition-colors hover:bg-surface-2"
                      >
                        {Row}
                      </Link>
                    </li>
                  );
                }

                return (
                  <li key={skill.title} className="opacity-80">
                    {Row}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* How it works */}
      <section className="mt-10">
        <h2 className="mb-4 text-[14px] font-semibold tracking-tight text-ink">
          Qanday ishlaydi
        </h2>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: CalendarDays,
              title: "Har kuni 00:05 da reja",
              body: "AI sizning darajangiz va maqsadingiz asosida 7 xil mashq turini aralashtiradi.",
            },
            {
              icon: Clock3,
              title: "4.5 soat kunlik maqsad",
              body: `Hozirgi kunlik maqsad: ${
                user?.dailyTargetMinutes ?? 270
              } minut. Sozlamalardan o‘zgartirsa bo‘ladi.`,
            },
            {
              icon: BrainCircuit,
              title: "Natijalar o‘sadi",
              body: "Analytics bo‘limida haftalik o‘sish va aniq ko‘nikmalar kuzatiladi.",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-lg border border-rule bg-white p-4"
              >
                <div className="mb-3 flex size-8 items-center justify-center rounded-md border border-rule">
                  <Icon size={15} strokeWidth={1.8} />
                </div>

                <p className="text-[12px] font-medium text-ink">
                  {item.title}
                </p>

                <p className="mt-1 text-[11px] leading-5 text-muted">
                  {item.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
