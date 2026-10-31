import {
  BookOpen,
  Clock3,
  Flame,
  Languages,
  ArrowUpRight,
  ArrowRight,
  Lock,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";

import {
  getCurrentUser,
  getSessionToken,
  SESSION_COOKIE,
} from "../lib/auth/session";
import {
  apiRequest,
  ApiError,
} from "../lib/api/server";

type TodayTask = {
  id: string;
  language: "english" | "german";
  type: string;
  title: string;
  estimatedMinutes: number;
  status: "pending" | "in_progress" | "completed";
};

type TodayResponse = {
  success: boolean;
  date: string;
  plan: {
    id: string;
    englishTargetMinutes: number;
    germanTargetMinutes: number;
    status: string;
  } | null;
  tasks: TodayTask[];
  stats: {
    total: number;
    completed: number;
    pending: number;
  };
};

type StatsResponse = {
  success: boolean;
  totalMinutes: number;
  byLanguage: { english: number; german: number };
  byDay: { date: string; english: number; german: number }[];
};

type StreakResponse = {
  success: boolean;
  currentStreak: number;
  activeToday: boolean;
};

type LangProgress = {
  unlocked: boolean;
  packsCompleted: number;
  perfectPacks: number;
  lastPackScore: number | null;
  lastPackDate: string | null;
};

type DailyPackResponse = {
  success: boolean;
  pack?: {
    language: "english" | "german";
    stats: { total: number; answered: number; correct: number };
    completed: boolean;
    score: number | null;
  };
  progress?: { english: LangProgress; german: LangProgress };
};

async function fetchJson<T>(endpoint: string): Promise<T | null> {
  const token = await getSessionToken();

  if (!token) return null;

  try {
    return await apiRequest<T>(endpoint, {
      cookie: `${SESSION_COOKIE}=${token}`,
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return null;
    }

    return null;
  }
}

export default async function DashboardPage() {
  const [user, today, stats, streak, daily] = await Promise.all([
    getCurrentUser(),
    fetchJson<TodayResponse>("/api/v1/tasks/today"),
    fetchJson<StatsResponse>("/api/v1/sessions/stats?days=7"),
    fetchJson<StreakResponse>("/api/v1/sessions/streak"),
    fetchJson<DailyPackResponse>("/api/v1/vocabulary/daily"),
  ]);

  const firstName =
    user?.displayName?.split(" ")[0] || "Learner";

  const completedTasks = today?.tasks.filter(
    (t) => t.status === "completed",
  ) ?? [];

  const studyMinutesToday = completedTasks.reduce(
    (sum, t) => sum + (t.estimatedMinutes || 0),
    0,
  );

  const progress =
    today && today.stats.total > 0
      ? Math.round(
          (today.stats.completed / today.stats.total) * 100,
        )
      : 0;

  const streakValue = streak?.currentStreak ?? 0;
  const weeklyMinutes = stats?.totalMinutes ?? 0;

  const statCards = [
    {
      title: "Study Time Today",
      value: `${studyMinutesToday} min`,
      subtitle:
        studyMinutesToday === 0
          ? "Bugun hali boshlanmagan"
          : `${completedTasks.length} ta mashq bajarildi`,
      icon: Clock3,
    },
    {
      title: "Learning Streak",
      value: `${streakValue} ${streakValue === 1 ? "day" : "days"}`,
      subtitle: streak?.activeToday
        ? "Bugun aktiv"
        : streakValue > 0
          ? "Bugun hali faollashmagan"
          : "Birinchi mashqni boshlang",
      icon: Flame,
    },
    {
      title: "Weekly Total",
      value: `${weeklyMinutes} min`,
      subtitle: "So‘nggi 7 kun",
      icon: BookOpen,
    },
    {
      title: "Today Progress",
      value: `${progress}%`,
      subtitle: today
        ? `${today.stats.completed}/${today.stats.total} ta mashq`
        : "Reja hali tayyor emas",
      icon: Languages,
    },
  ];

  const dailyTarget = user?.dailyTargetMinutes ?? 270;
  const targetProgress = Math.min(
    100,
    Math.round((studyMinutesToday / dailyTarget) * 100),
  );

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-8 md:px-8">
      {/* Welcome */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center rounded-md border border-rule bg-surface-2 px-2 py-1 text-[11px] font-medium text-ink-3">
            Learning Dashboard
          </span>
        </div>

        <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-ink md:text-[32px]">
          Welcome back, {firstName}
        </h1>

        <p className="mt-2 text-[13px] text-ink-3">
          Bugungi o‘quv jarayoningizning qisqa ko‘rinishi.
        </p>
      </div>

      {/* Daily 100-word pack CTA */}
      {daily && daily.pack && (
        (() => {
          const activeLang = daily.pack.language;
          const flag = activeLang === "english" ? "🇬🇧" : "🇩🇪";
          const label = activeLang === "english" ? "English" : "German";
          const done = daily.pack.stats.answered;
          const total = daily.pack.stats.total;
          const correct = daily.pack.stats.correct;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const packDone = daily.pack.completed;
          const germanLocked =
            daily.progress?.german && !daily.progress.german.unlocked;

          return (
            <div className="mb-8 overflow-hidden rounded-xl border border-rule bg-gradient-to-br from-[#171717] to-[#333333] p-6 text-white">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white/80">
                    <Zap size={11} />
                    Bugungi 100 so‘z
                  </div>

                  <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
                    {flag} {label} vocabulary paki
                  </h2>

                  <p className="mt-2 text-[13px] text-white/70">
                    {packDone
                      ? `Bugungi pak yakunlangan: ${correct}/${total} to‘g‘ri · ${daily.pack.score ?? 0}%`
                      : done === 0
                        ? "100 ta yangi so‘z sizni kutmoqda. Keling, boshlaymiz."
                        : `${done}/${total} ta so‘zda urindingiz. Davom ettirasizmi?`}
                  </p>

                  {germanLocked && activeLang === "english" && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-white/60">
                      <Lock size={11} />
                      Nemis tili ochilishi uchun 100% ball oling
                    </p>
                  )}

                  {!packDone && done > 0 && (
                    <div className="mt-4 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-white/10">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-white"
                      />
                    </div>
                  )}
                </div>

                <Link
                  href="/dashboard/vocabulary/daily"
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-[13px] font-medium text-ink transition-colors hover:bg-white/90"
                >
                  <Sparkles size={14} />
                  {packDone
                    ? "Natijani ko‘rish"
                    : done === 0
                      ? "Boshlash"
                      : "Davom ettirish"}
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          );
        })()
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-lg border border-rule bg-white p-5"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="text-[12px] text-ink-3">
                  {stat.title}
                </span>

                <Icon
                  size={17}
                  strokeWidth={1.8}
                  className="text-muted"
                />
              </div>

              <p className="text-[26px] font-semibold tracking-[-0.04em] tabular-nums text-ink">
                {stat.value}
              </p>

              <p className="mt-2 text-[11px] text-muted">
                {stat.subtitle}
              </p>
            </div>
          );
        })}
      </div>

      {/* Daily target progress */}
      <div className="mt-6 rounded-lg border border-rule bg-white p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-semibold text-ink">
              Daily goal
            </h2>
            <p className="mt-0.5 text-[11px] text-muted">
              {studyMinutesToday} / {dailyTarget} min bugun
            </p>
          </div>
          <span className="text-[20px] font-semibold tabular-nums text-ink">
            {targetProgress}%
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
          <div
            style={{ width: `${targetProgress}%` }}
            className="h-full rounded-full bg-ink transition-all"
          />
        </div>
      </div>

      {/* Languages */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight text-ink">
              Your Languages
            </h2>

            <p className="mt-1 text-[12px] text-ink-3">
              O‘rganishni to‘xtatgan joyingizdan davom eting.
            </p>
          </div>

          <Link
            href="/dashboard/lessons"
            className="flex items-center gap-1 text-[12px] font-medium text-ink-2 hover:text-black"
          >
            View lessons
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* English */}
          <Link
            href="/dashboard/vocabulary"
            className="group rounded-lg border border-rule bg-white p-6 transition-colors hover:border-[#d4d4d4]"
          >
            <div className="mb-6 flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-surface-3 text-xl">
                🇬🇧
              </div>

              <ArrowUpRight
                size={17}
                className="text-muted transition-colors group-hover:text-black"
              />
            </div>

            <h3 className="text-[17px] font-semibold text-ink">
              English
            </h3>

            <p className="mt-1 text-[12px] text-ink-3">
              Current level:{" "}
              {user?.englishLevelEstimate || "Not assessed"}
            </p>

            <p className="mt-3 text-[11px] text-muted tabular-nums">
              Haftada: {stats?.byLanguage.english ?? 0} min
            </p>

            <div className="mt-5 flex items-center justify-between border-t border-rule-soft pt-4">
              <span className="text-[12px] text-ink-3">
                Vocabulary ochish
              </span>

              <ArrowRight size={16} />
            </div>
          </Link>

          {/* German */}
          <Link
            href="/dashboard/vocabulary"
            className="group rounded-lg border border-rule bg-white p-6 transition-colors hover:border-[#d4d4d4]"
          >
            <div className="mb-6 flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-surface-3 text-xl">
                🇩🇪
              </div>

              <ArrowUpRight
                size={17}
                className="text-muted transition-colors group-hover:text-black"
              />
            </div>

            <h3 className="text-[17px] font-semibold text-ink">
              German
            </h3>

            <p className="mt-1 text-[12px] text-ink-3">
              Current level:{" "}
              {user?.germanLevelEstimate || "Not assessed"}
            </p>

            <p className="mt-3 text-[11px] text-muted tabular-nums">
              Haftada: {stats?.byLanguage.german ?? 0} min
            </p>

            <div className="mt-5 flex items-center justify-between border-t border-rule-soft pt-4">
              <span className="text-[12px] text-ink-3">
                Grundwortschatz
              </span>

              <ArrowRight size={16} />
            </div>
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-[16px] font-semibold tracking-tight text-ink">
          Quick Actions
        </h2>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              title: "Start a Lesson",
              description: "O‘rganishni davom ettirish",
              href: "/dashboard/lessons",
              icon: BookOpen,
            },
            {
              title: "Practice with AI",
              description: "Nutqni rivojlantirish",
              href: "/dashboard/practice",
              icon: Languages,
            },
            {
              title: "Study Planner",
              description: "Bugungi mashqlar",
              href: "/dashboard/planner",
              icon: Clock3,
            },
          ].map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.title}
                href={action.href}
                className="group flex items-center gap-3 rounded-lg border border-rule bg-white p-4 transition-colors hover:bg-surface-2"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-rule">
                  <Icon size={17} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-ink">
                    {action.title}
                  </p>

                  <p className="mt-1 text-[11px] text-muted">
                    {action.description}
                  </p>
                </div>

                <ArrowUpRight
                  size={15}
                  className="text-muted group-hover:text-black"
                />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
