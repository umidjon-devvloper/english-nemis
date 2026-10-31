import {
  Activity,
  BarChart3,
  BookOpen,
  Calendar,
  Clock3,
  Flame,
  Languages,
  Target,
  TrendingUp,
} from "lucide-react";

import {
  getCurrentUser,
  getSessionToken,
  SESSION_COOKIE,
} from "../../lib/auth/session";
import {
  apiRequest,
  ApiError,
} from "../../lib/api/server";

type StatsResponse = {
  success: boolean;
  range: { from: string; to: string; days: number };
  totalMinutes: number;
  byLanguage: { english: number; german: number };
  byActivity: Record<string, number>;
  byDay: { date: string; english: number; german: number }[];
  accuracy: number | null;
  sessionsRecorded: number;
  tasksCompleted: number;
};

type StreakResponse = {
  success: boolean;
  currentStreak: number;
  activeToday: boolean;
};

const DAY_LABELS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

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

function dayLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  // JS: 0=Sun … 6=Sat. We want Du=Mon as 0.
  const jsDay = date.getUTCDay();
  const index = (jsDay + 6) % 7;

  return DAY_LABELS[index];
}

const ACTIVITY_LABELS: Record<string, string> = {
  vocabulary: "Vocabulary",
  practice: "AI Practice",
  reading: "Reading",
  writing: "Writing",
  task: "Daily Tasks",
  fill_blank: "Fill in the blank",
  multiple_choice: "Multiple choice",
  translation: "Translation",
  sentence_building: "Sentence building",
  grammar_correction: "Grammar",
};

function formatActivity(key: string) {
  return (
    ACTIVITY_LABELS[key] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export default async function AnalyticsPage() {
  const [user, stats, streak] = await Promise.all([
    getCurrentUser(),
    fetchJson<StatsResponse>("/api/v1/sessions/stats?days=7"),
    fetchJson<StreakResponse>("/api/v1/sessions/streak"),
  ]);

  const dailyTarget = user?.dailyTargetMinutes ?? 270;
  const weeklyTotal = stats?.totalMinutes ?? 0;

  const activityEntries = Object.entries(stats?.byActivity ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const activityMax = Math.max(1, ...activityEntries.map(([, v]) => v));

  const dayData = stats?.byDay ?? [];
  const maxDay = Math.max(
    1,
    ...dayData.map((d) => d.english + d.german),
  );

  const statCards = [
    {
      title: "This Week",
      value: `${weeklyTotal} min`,
      hint: "Jami o‘qish vaqti",
      icon: Clock3,
    },
    {
      title: "Daily Goal",
      value: `${dailyTarget} min`,
      hint: "Kunlik maqsad",
      icon: Target,
    },
    {
      title: "Streak",
      value: `${streak?.currentStreak ?? 0} days`,
      hint: streak?.activeToday
        ? "Bugun aktiv"
        : "Birinchi mashqni boshlang",
      icon: Flame,
    },
    {
      title: "Accuracy",
      value: stats?.accuracy != null ? `${stats.accuracy}%` : "—",
      hint:
        stats?.accuracy != null
          ? "Haftalik o‘rtacha"
          : "Yetarli ma’lumot yo‘q",
      icon: Activity,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-8 md:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-rule bg-surface-2 px-2 py-1 text-[11px] font-medium text-ink-3">
              Analytics
            </span>
          </div>

          <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-ink md:text-[32px]">
            Your Progress
          </h1>

          <p className="mt-2 text-[13px] text-ink-3">
            O‘quv vaqtingiz, aniqligingiz va ko‘nikmalaringiz bo‘yicha haftalik tahlil.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-md border border-rule bg-white px-3 py-2 text-[11px] font-medium text-ink-2">
          <Calendar size={13} />
          Last 7 days
        </div>
      </div>

      {/* Stat cards */}
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
                {stat.hint}
              </p>
            </div>
          );
        })}
      </div>

      {/* Weekly chart */}
      <div className="mt-8 rounded-lg border border-rule bg-white p-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">
              Study time, last 7 days
            </h2>

            <p className="mt-1 text-[12px] text-ink-3">
              Har bir kundagi ingliz va nemis mashqlariga sarflangan daqiqalar.
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-ink-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-sm bg-ink" />
              English
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-sm bg-[#c9a86a]" />
              German
            </span>
          </div>
        </div>

        <div className="flex items-end justify-between gap-2 pt-4">
          {(dayData.length > 0
            ? dayData
            : Array.from({ length: 7 }, () => ({
                date: "",
                english: 0,
                german: 0,
              }))
          ).map((d, idx) => {
            const total = d.english + d.german;
            const h = Math.round((total / maxDay) * 160);
            const enH =
              total > 0 ? (d.english / total) * h : 0;
            const deH =
              total > 0 ? (d.german / total) * h : 0;

            return (
              <div
                key={d.date || idx}
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
              >
                <div className="flex h-[160px] w-full items-end justify-center">
                  {total === 0 ? (
                    <div className="h-[2px] w-6 rounded-full bg-rule" />
                  ) : (
                    <div className="flex w-7 flex-col overflow-hidden rounded-md">
                      <div
                        style={{ height: enH }}
                        className="bg-ink"
                      />
                      <div
                        style={{ height: deH }}
                        className="bg-[#c9a86a]"
                      />
                    </div>
                  )}
                </div>

                <span className="text-[11px] text-ink-3">
                  {d.date ? dayLabel(d.date) : DAY_LABELS[idx]}
                </span>

                <span className="text-[10px] tabular-nums text-muted">
                  {total || "–"}
                </span>
              </div>
            );
          })}
        </div>

        {weeklyTotal === 0 && (
          <div className="mt-6 flex items-start gap-3 rounded-md border border-dashed border-rule bg-surface-2 p-4">
            <TrendingUp
              size={16}
              className="mt-0.5 shrink-0 text-muted"
            />

            <p className="text-[12px] leading-5 text-ink-3">
              Hali o‘quv sessiyalari qayd etilmagan. Planner’dan birinchi mashqni yakunlang — grafik avtomatik to‘ladi.
            </p>
          </div>
        )}
      </div>

      {/* Breakdown + Language split */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Activity breakdown */}
        <div className="rounded-lg border border-rule bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={15} className="text-ink" />
              <h2 className="text-[14px] font-semibold text-ink">
                Activity breakdown
              </h2>
            </div>

            <span className="text-[11px] text-muted">
              Last 7 days
            </span>
          </div>

          {activityEntries.length === 0 ? (
            <div className="rounded-md border border-dashed border-rule bg-surface-2 p-4 text-[12px] text-ink-3">
              Faoliyat ma’lumotlari hali yo‘q.
            </div>
          ) : (
            <ul className="space-y-3">
              {activityEntries.map(([key, minutes]) => (
                <li key={key}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="text-ink-2">
                      {formatActivity(key)}
                    </span>

                    <span className="tabular-nums text-muted">
                      {minutes} min
                    </span>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div
                      style={{
                        width: `${Math.round((minutes / activityMax) * 100)}%`,
                      }}
                      className="h-full rounded-full bg-ink"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Language split */}
        <div className="rounded-lg border border-rule bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Languages size={15} className="text-ink" />
              <h2 className="text-[14px] font-semibold text-ink">
                Language split
              </h2>
            </div>

            <span className="text-[11px] text-muted">
              Last 7 days
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: "English",
                flag: "🇬🇧",
                value: stats?.byLanguage.english ?? 0,
                level: user?.englishLevelEstimate ?? "—",
              },
              {
                label: "German",
                flag: "🇩🇪",
                value: stats?.byLanguage.german ?? 0,
                level: user?.germanLevelEstimate ?? "—",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-md border border-rule bg-surface-2 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg">{row.flag}</span>
                  <span className="text-[12px] font-medium text-ink-2">
                    {row.label}
                  </span>
                </div>

                <p className="text-[22px] font-semibold tabular-nums text-ink">
                  {row.value}
                  <span className="ml-1 text-[12px] font-normal text-muted">
                    min
                  </span>
                </p>

                <p className="mt-1 text-[11px] text-muted">
                  Level: {row.level}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-md border border-dashed border-rule bg-white p-3">
            <BookOpen
              size={14}
              className="mt-0.5 shrink-0 text-muted"
            />

            <p className="text-[11px] leading-5 text-ink-3">
              Statistika: {stats?.tasksCompleted ?? 0} ta mashq +{" "}
              {stats?.sessionsRecorded ?? 0} ta sessiya qayd etildi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
