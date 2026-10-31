"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  GraduationCap,
  Layers3,
  Loader2,
  RefreshCw,
} from "lucide-react";

import type {
  VocabularyBook,
  VocabularyUnit,
  UnitsResponse,
} from "../../types/vocabulary/types";

type Props = {
  bookId: string;
};

export default function VocabularyUnits({ bookId }: Props) {
  const [book, setBook] = useState<VocabularyBook | null>(null);
  const [units, setUnits] = useState<VocabularyUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadUnits() {
      setLoading(true);
      setError("");
      setBook(null);
      setUnits([]);

      try {
        const response = await fetch(
          `/api/vocabulary/books/${encodeURIComponent(bookId)}/units`,
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

        let data: UnitsResponse;

        try {
          data = JSON.parse(text) as UnitsResponse;
        } catch {
          throw new Error(
            `API noto‘g‘ri JSON qaytardi (${response.status})`
          );
        }

        if (!response.ok || !data.success) {
          throw new Error(
            `Unitlarni yuklab bo‘lmadi (${response.status})`
          );
        }

        if (!data.book || !Array.isArray(data.units)) {
          throw new Error("API noto‘g‘ri formatda javob qaytardi");
        }

        if (controller.signal.aborted) return;

        setBook(data.book);
        setUnits(data.units);
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

    void loadUnits();

    return () => controller.abort();
  }, [bookId]);

  const totalWords = units.reduce(
    (sum, unit) => sum + (unit.totalWords || 0),
    0
  );

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

            <span className="font-medium text-ink">
              {book?.title || "Book"}
            </span>
          </nav>

          {/* BACK BUTTON */}
          <Link
            href="/dashboard/vocabulary"
            className="mb-6 inline-flex h-8 items-center gap-2 rounded-md border border-rule bg-white px-3 text-xs font-medium text-[#666666] transition-colors hover:border-[#bdbdbd] hover:bg-surface-2 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Barcha kitoblar
          </Link>

          {/* TITLE */}
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-rule bg-surface-2">
                  <GraduationCap className="h-4 w-4 text-ink" />
                </div>

                <span className="text-xs font-medium text-[#666666]">
                  English Learning
                </span>
              </div>

              <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-ink sm:text-[34px]">
                {loading ? "Loading..." : book?.title || "Vocabulary"}
              </h1>

              <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#666666]">
                Unitlarni tanlang, yangi so‘zlarni o‘rganing va
                reading mashqlari orqali bilimingizni mustahkamlang.
              </p>
            </div>

            {book && (
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 items-center rounded-md border border-rule bg-white px-3 text-xs font-medium text-[#666666]">
                  English
                </span>

                {book.level && (
                  <span className="inline-flex h-8 items-center rounded-md border border-rule bg-surface-2 px-3 text-xs font-medium text-[#444444]">
                    {book.level}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        {/* ERROR */}
        {!loading && error && (
          <div className="rounded-lg border border-[#f5c2c0] bg-danger-bg p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#f5c2c0] bg-white">
                <RefreshCw className="h-4 w-4 text-[#c0392b]" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-danger">
                  Ma’lumotlarni yuklashda xatolik
                </h3>

                <p className="mt-1 text-[13px] text-danger">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-rule bg-white">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[#888888]" />

              <p className="text-xs text-[#888888]">
                Unitlar yuklanmoqda...
              </p>
            </div>
          </div>
        )}

        {/* LOADED CONTENT */}
        {!loading && !error && book && (
          <>
            {/* OVERVIEW */}
            <div className="mb-9 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-rule bg-white p-4">
                <p className="text-xs font-medium text-[#888888]">
                  Total Units
                </p>

                <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  {units.length}
                </p>
              </div>

              <div className="rounded-lg border border-rule bg-white p-4">
                <p className="text-xs font-medium text-[#888888]">
                  Total Words
                </p>

                <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  {totalWords}
                </p>
              </div>

              <div className="col-span-2 rounded-lg border border-rule bg-white p-4 sm:col-span-1">
                <p className="text-xs font-medium text-[#888888]">
                  Level
                </p>

                <p className="mt-2 text-lg font-semibold text-ink">
                  {book.level || "English"}
                </p>
              </div>
            </div>

            {/* SECTION HEADER */}
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[17px] font-semibold tracking-tight text-ink">
                  Book Units
                </h2>

                <p className="mt-1 text-[13px] text-[#888888]">
                  O‘rganishni boshlash uchun unitni tanlang.
                </p>
              </div>

              <span className="rounded-md border border-rule bg-surface-2 px-2.5 py-1 text-xs font-medium text-[#666666]">
                {units.length} units
              </span>
            </div>

            {/* EMPTY STATE */}
            {units.length === 0 && (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-rule bg-white px-6 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-rule bg-surface-2">
                  <BookOpen className="h-5 w-5 text-[#666666]" />
                </div>

                <h3 className="text-sm font-semibold text-ink">
                  Unitlar mavjud emas
                </h3>

                <p className="mt-2 max-w-xs text-[13px] leading-5 text-[#888888]">
                  Bu kitob uchun unitlar hali qo‘shilmagan.
                </p>
              </div>
            )}

            {/* UNITS GRID */}
            {units.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {units.map((unit) => (
                  <Link
                    key={unit._id}
                    href={`/dashboard/vocabulary/units/${unit._id}`}
                    className="
                      group flex min-h-[190px] flex-col
                      rounded-xl border border-rule
                      bg-white p-5
                      transition-all duration-200
                      hover:border-[#bdbdbd]
                      hover:shadow-[0_4px_16px_rgba(0,0,0,0.045)]
                      focus-visible:outline-2
                      focus-visible:outline-offset-2
                      focus-visible:outline-black
                    "
                  >
                    {/* CARD TOP */}
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rule bg-surface-2 text-[14px] font-semibold text-ink transition-colors group-hover:bg-surface-3">
                        {String(unit.unitNumber).padStart(2, "0")}
                      </div>

                      <span className="inline-flex items-center rounded-md border border-rule bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-[#666666]">
                        Unit {unit.unitNumber}
                      </span>
                    </div>

                    {/* CARD CONTENT */}
                    <div className="mt-5">
                      <h3 className="truncate text-[16px] font-semibold tracking-[-0.025em] text-ink">
                        {unit.title}
                      </h3>

                      <div className="mt-3 flex items-center gap-2 text-[12px] text-[#888888]">
                        <Layers3 className="h-3.5 w-3.5" />

                        <span>{unit.totalWords} ta so‘z</span>
                      </div>
                    </div>

                    {/* CARD FOOTER */}
                    <div className="mt-auto flex items-center justify-between border-t border-rule-soft pt-4">
                      <span className="text-[12px] font-medium text-[#666666] transition-colors group-hover:text-ink">
                        Unitni ochish
                      </span>

                      <ArrowUpRight className="h-4 w-4 text-[#999999] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* FOOTER */}
            {units.length > 0 && (
              <div className="mt-8 flex flex-col justify-between gap-2 border-t border-rule pt-5 text-[12px] text-[#888888] sm:flex-row sm:items-center">
                <span>
                  Showing {units.length} of {units.length} units
                </span>

                <span>
                  {book.title} · LinguaCoach AI
                </span>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}