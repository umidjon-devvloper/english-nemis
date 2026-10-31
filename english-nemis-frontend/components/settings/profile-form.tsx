"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import type { AuthUser } from "../../app/lib/auth/session";

const ENGLISH_LEVELS = [
  "A0",
  "A1",
  "A2",
  "B1",
  "B1-B2",
  "B2",
  "C1",
  "C2",
] as const;

const GERMAN_LEVELS = [
  "A0",
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
] as const;

const SKILL_OPTIONS = [
  "Speaking",
  "Listening",
  "Reading",
  "Writing",
  "Grammar",
  "Vocabulary",
  "Pronunciation",
] as const;

const EXPLANATION_LANGUAGES = [
  { value: "uz", label: "O‘zbekcha" },
  { value: "en", label: "English" },
  { value: "ru", label: "Русский" },
] as const;

const TIMEZONES = [
  "Asia/Tashkent",
  "Asia/Almaty",
  "Asia/Dubai",
  "Europe/Berlin",
  "Europe/London",
  "America/New_York",
  "UTC",
] as const;

type Props = {
  user: AuthUser;
};

export function ProfileForm({ user }: Props) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(
    user.displayName,
  );
  const [timezone, setTimezone] = useState(
    user.timezone || "Asia/Tashkent",
  );
  const [explanationLang, setExplanationLang] = useState(
    user.preferredExplanationLanguage || "uz",
  );
  const [englishLevel, setEnglishLevel] = useState(
    user.englishLevelEstimate || "B1-B2",
  );
  const [germanLevel, setGermanLevel] = useState(
    user.germanLevelEstimate || "A0",
  );
  const [dailyTarget, setDailyTarget] = useState(
    user.dailyTargetMinutes ?? 270,
  );
  const [minTarget, setMinTarget] = useState(
    user.minimumTargetMinutes ?? 240,
  );
  const [maxTarget, setMaxTarget] = useState(
    user.extendedTargetMinutes ?? 300,
  );
  const [packSize, setPackSize] = useState(
    user.dailyPackSize ?? 100,
  );
  const [englishGoals, setEnglishGoals] = useState<string[]>(
    user.learningGoals?.english ?? [
      "Speaking",
      "Listening",
      "Grammar",
      "Vocabulary",
    ],
  );
  const [germanGoals, setGermanGoals] = useState<string[]>(
    user.learningGoals?.german ?? [
      "Vocabulary",
      "Grammar",
      "Speaking",
    ],
  );

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState("");

  const toggleGoal = (
    list: string[],
    setList: (next: string[]) => void,
    skill: string,
  ) => {
    if (list.includes(skill)) {
      setList(list.filter((s) => s !== skill));
    } else {
      setList([...list, skill]);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (minTarget > dailyTarget || dailyTarget > maxTarget) {
      setError(
        "Minimal ≤ kunlik ≤ kengaytirilgan tartibi buzilgan.",
      );

      return;
    }

    setSaving(true);
    setSavedAt(null);

    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          displayName,
          timezone,
          preferredExplanationLanguage: explanationLang,
          dailyTargetMinutes: dailyTarget,
          minimumTargetMinutes: minTarget,
          extendedTargetMinutes: maxTarget,
          dailyPackSize: packSize,
          englishLevelEstimate: englishLevel,
          germanLevelEstimate: germanLevel,
          learningGoals: {
            english: englishGoals,
            german: germanGoals,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Saqlab bo‘lmadi");
      }

      setSavedAt(Date.now());
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Xatolik yuz berdi",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal */}
      <Section
        title="Shaxsiy ma’lumotlar"
        description="Ism, vaqt mintaqasi va izohlar tili."
      >
        <Field label="Email">
          <input
            value={user.email}
            disabled
            className="h-10 w-full rounded-md border border-rule bg-surface-2 px-3 text-[13px] text-ink-3"
          />
        </Field>

        <Field label="Ismingiz">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            minLength={2}
            maxLength={80}
            required
            className="h-10 w-full rounded-md border border-rule bg-white px-3 text-[13px] text-ink focus:border-ink focus:outline-none"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vaqt mintaqasi">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-10 w-full rounded-md border border-rule bg-white px-3 text-[13px] text-ink focus:border-ink focus:outline-none"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Izohlar tili">
            <select
              value={explanationLang}
              onChange={(e) =>
                setExplanationLang(
                  e.target.value as typeof explanationLang,
                )
              }
              className="h-10 w-full rounded-md border border-rule bg-white px-3 text-[13px] text-ink focus:border-ink focus:outline-none"
            >
              {EXPLANATION_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* Levels */}
      <Section
        title="Hozirgi daraja"
        description="AI mashqlar ushbu darajalar asosida tayyorlaydi."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="🇬🇧 English level">
            <select
              value={englishLevel}
              onChange={(e) => setEnglishLevel(e.target.value)}
              className="h-10 w-full rounded-md border border-rule bg-white px-3 text-[13px] text-ink focus:border-ink focus:outline-none"
            >
              {ENGLISH_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>

          <Field label="🇩🇪 German level">
            <select
              value={germanLevel}
              onChange={(e) => setGermanLevel(e.target.value)}
              className="h-10 w-full rounded-md border border-rule bg-white px-3 text-[13px] text-ink focus:border-ink focus:outline-none"
            >
              {GERMAN_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* Daily vocabulary pack */}
      <Section
        title="Kundalik so‘zlar paki"
        description="Har kuni nechta so‘z yuborilishini sozlang. 10 dan 300 gacha."
      >
        <Field label="Pak hajmi (so‘z/kun)">
          <input
            type="number"
            min={10}
            max={300}
            step={10}
            value={packSize}
            onChange={(e) => setPackSize(Number(e.target.value))}
            className="h-10 w-32 rounded-md border border-rule bg-white px-3 text-[13px] tabular-nums text-ink focus:border-ink focus:outline-none"
          />
        </Field>
        <p className="text-[11px] text-muted">
          Standart: 100 so‘z/kun. O‘zgartirilgandan keyin yangi pak ertaga chiqadi.
        </p>
      </Section>

      {/* Targets */}
      <Section
        title="Kunlik maqsadlar"
        description="O‘quv vaqti chegaralari: minimal ≤ kunlik ≤ kengaytirilgan."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Minimal (min)">
            <input
              type="number"
              min={15}
              max={600}
              value={minTarget}
              onChange={(e) =>
                setMinTarget(Number(e.target.value))
              }
              className="h-10 w-full rounded-md border border-rule bg-white px-3 text-[13px] tabular-nums text-ink focus:border-ink focus:outline-none"
            />
          </Field>

          <Field label="Kunlik (min)">
            <input
              type="number"
              min={15}
              max={600}
              value={dailyTarget}
              onChange={(e) =>
                setDailyTarget(Number(e.target.value))
              }
              className="h-10 w-full rounded-md border border-rule bg-white px-3 text-[13px] tabular-nums text-ink focus:border-ink focus:outline-none"
            />
          </Field>

          <Field label="Kengaytirilgan (min)">
            <input
              type="number"
              min={15}
              max={600}
              value={maxTarget}
              onChange={(e) =>
                setMaxTarget(Number(e.target.value))
              }
              className="h-10 w-full rounded-md border border-rule bg-white px-3 text-[13px] tabular-nums text-ink focus:border-ink focus:outline-none"
            />
          </Field>
        </div>
      </Section>

      {/* Goals */}
      <Section
        title="O‘rganish maqsadlari"
        description="Qaysi ko‘nikmalarga ko‘proq urg‘u berilsin."
      >
        <GoalSelector
          label="🇬🇧 English goals"
          selected={englishGoals}
          onToggle={(skill) =>
            toggleGoal(englishGoals, setEnglishGoals, skill)
          }
        />

        <GoalSelector
          label="🇩🇪 German goals"
          selected={germanGoals}
          onToggle={(skill) =>
            toggleGoal(germanGoals, setGermanGoals, skill)
          }
        />
      </Section>

      {/* Save bar */}
      <div className="sticky bottom-0 -mx-5 -mb-8 flex items-center justify-end gap-3 border-t border-rule bg-white px-5 py-4 md:-mx-8 md:px-8">
        {error && (
          <p className="mr-auto text-[12px] text-red-600">
            {error}
          </p>
        )}

        {savedAt && !error && (
          <p className="mr-auto inline-flex items-center gap-1.5 text-[12px] text-ok">
            <Check size={13} />
            Saqlandi
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#333333] disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Saqlanmoqda...
            </>
          ) : (
            "Saqlash"
          )}
        </button>
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-rule bg-white p-5">
      <header className="mb-4">
        <h2 className="text-[14px] font-semibold text-ink">
          {title}
        </h2>

        <p className="mt-1 text-[12px] text-ink-3">
          {description}
        </p>
      </header>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3">
        {label}
      </span>
      {children}
    </label>
  );
}

function GoalSelector({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: string[];
  onToggle: (skill: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3">
        {label}
      </p>

      <div className="flex flex-wrap gap-2">
        {SKILL_OPTIONS.map((skill) => {
          const active = selected.includes(skill);

          return (
            <button
              key={skill}
              type="button"
              onClick={() => onToggle(skill)}
              className={[
                "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[12px] font-medium transition-colors",
                active
                  ? "border-ink bg-ink text-white"
                  : "border-rule bg-white text-ink-2 hover:border-[#d4d4d4]",
              ].join(" ")}
            >
              {active && <Check size={12} />}
              {skill}
            </button>
          );
        })}
      </div>
    </div>
  );
}
