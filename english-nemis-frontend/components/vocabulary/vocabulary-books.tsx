"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
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
  BooksResponse,
} from "../../types/vocabulary/types";

type Language = "english" | "german";

const LANGUAGE_META: Record<
  Language,
  {
    label: string;
    flag: string;
    tagline: string;
    emptyTitle: string;
    emptyBody: string;
    sectionTitle: string;
    sectionHint: string;
    levelHint: string;
  }
> = {
  english: {
    label: "English",
    flag: "🇬🇧",
    tagline:
      "Ingliz tilidagi so‘zlarni o‘rganing, mashqlar bajaring va reading orqali bilimingizni mustahkamlang.",
    emptyTitle: "Kitoblar mavjud emas",
    emptyBody:
      "Hozircha English vocabulary kitoblari qo‘shilmagan.",
    sectionTitle: "Essential English Words",
    sectionHint: "O‘rganishni boshlash uchun kitobni tanlang.",
    levelHint: "A1 – B2",
  },
  german: {
    label: "German",
    flag: "🇩🇪",
    tagline:
      "Nemis tili so‘z boyligini oshiring: der/die/das, ko‘plik va kelishiklar bilan birga mashq qiling.",
    emptyTitle: "Kitoblar hali qo‘shilmagan",
    emptyBody:
      "German vocabulary kitoblari yaqinda qo‘shiladi.",
    sectionTitle: "Grundwortschatz",
    sectionHint: "O‘rganishni boshlash uchun kitobni tanlang.",
    levelHint: "A1 – B1",
  },
};

export default function VocabularyBooks() {
  const [language, setLanguage] =
    useState<Language>("english");
  const [books, setBooks] = useState<VocabularyBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadBooks() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/vocabulary/books?language=${language}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const contentType =
          response.headers.get("content-type") ?? "";

        if (!contentType.includes("application/json")) {
          throw new Error(
            `API JSON qaytarmadi (${response.status})`,
          );
        }

        const data: BooksResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error("Kitoblarni yuklab bo‘lmadi");
        }

        if (!Array.isArray(data.books)) {
          throw new Error("API noto‘g‘ri formatda javob qaytardi");
        }

        if (!controller.signal.aborted) {
          setBooks(data.books);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Xatolik yuz berdi",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadBooks();

    return () => controller.abort();
  }, [language]);

  const meta = LANGUAGE_META[language];

  const totalUnits = books.reduce(
    (sum, book) => sum + (book.totalUnits || 0),
    0,
  );

  return (
    <div className="min-h-full bg-white text-ink">
      {/* PAGE HEADER */}
      <header className="border-b border-rule bg-white">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          {/* BREADCRUMB */}
          <nav className="mb-6 flex items-center gap-2 text-[13px] text-[#888888]">
            <span>Learning</span>

            <ChevronRight className="h-3.5 w-3.5" />

            <span className="font-medium text-ink">
              Vocabulary
            </span>
          </nav>

          {/* TITLE */}
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-rule bg-surface-2">
                  <GraduationCap className="h-4 w-4 text-ink" />
                </div>

                <span className="text-xs font-medium text-[#666666]">
                  {meta.label} Learning
                </span>
              </div>

              <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-ink sm:text-[34px]">
                Vocabulary
              </h1>

              <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#666666]">
                {meta.tagline}
              </p>
            </div>

            {/* LANGUAGE SWITCHER + LEVEL */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                role="tablist"
                aria-label="Language"
                className="inline-flex items-center rounded-md border border-rule bg-surface-2 p-0.5"
              >
                {(Object.keys(LANGUAGE_META) as Language[]).map(
                  (lang) => {
                    const active = lang === language;
                    const info = LANGUAGE_META[lang];

                    return (
                      <button
                        key={lang}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setLanguage(lang)}
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
                  },
                )}
              </div>

              <span className="inline-flex h-8 items-center rounded-md border border-rule bg-surface-2 px-3 text-xs font-medium text-[#444444]">
                {meta.levelHint}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        {/* OVERVIEW */}
        <div className="mb-9 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-rule bg-white p-4">
            <p className="text-xs font-medium text-[#888888]">
              Total Books
            </p>

            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              {loading ? "—" : books.length}
            </p>
          </div>

          <div className="rounded-lg border border-rule bg-white p-4">
            <p className="text-xs font-medium text-[#888888]">
              Total Units
            </p>

            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              {loading ? "—" : totalUnits}
            </p>
          </div>

          <div className="col-span-2 rounded-lg border border-rule bg-white p-4 sm:col-span-1">
            <p className="text-xs font-medium text-[#888888]">
              Language
            </p>

            <p className="mt-2 text-lg font-semibold text-ink">
              {meta.label}
            </p>
          </div>
        </div>

        {/* SECTION HEADER */}
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-ink">
              {meta.sectionTitle}
            </h2>

            <p className="mt-1 text-[13px] text-[#888888]">
              {meta.sectionHint}
            </p>
          </div>

          {!loading && !error && (
            <span className="rounded-md border border-rule bg-surface-2 px-2.5 py-1 text-xs font-medium text-[#666666]">
              {books.length} books
            </span>
          )}
        </div>

        {/* LOADING */}
        {loading && (
          <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-rule bg-white">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[#888888]" />

              <p className="text-xs text-[#888888]">
                Kitoblar yuklanmoqda...
              </p>
            </div>
          </div>
        )}

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

        {/* EMPTY STATE */}
        {!loading && !error && books.length === 0 && (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-rule bg-white px-6 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-rule bg-surface-2">
              <BookOpen className="h-5 w-5 text-[#666666]" />
            </div>

            <h3 className="text-sm font-semibold text-ink">
              {meta.emptyTitle}
            </h3>

            <p className="mt-2 max-w-xs text-[13px] leading-5 text-[#888888]">
              {meta.emptyBody}
            </p>
          </div>
        )}

        {/* BOOKS GRID */}
        {!loading && !error && books.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {books.map((book, index) => (
              <Link
                key={book._id}
                href={`/dashboard/vocabulary/${book._id}`}
                className="
                  group relative flex min-h-[205px] flex-col
                  overflow-hidden rounded-xl
                  border border-rule
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rule bg-surface-2 transition-colors group-hover:bg-surface-3">
                    <BookOpen
                      className="h-[19px] w-[19px] text-[#444444]"
                      strokeWidth={1.7}
                    />
                  </div>

                  <span className="inline-flex items-center rounded-md border border-rule bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-[#666666]">
                    {book.level || meta.label}
                  </span>
                </div>

                {/* CARD CONTENT */}
                <div className="mt-5">
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">
                    Book {index + 1}
                  </p>

                  <h3 className="text-[17px] font-semibold tracking-[-0.025em] text-ink">
                    {book.title}
                  </h3>

                  <div className="mt-3 flex items-center gap-2 text-[12px] text-[#888888]">
                    <Layers3 className="h-3.5 w-3.5" />

                    <span>{book.totalUnits} ta unit</span>
                  </div>
                </div>

                {/* CARD FOOTER */}
                <div className="mt-auto flex items-center justify-between border-t border-rule-soft pt-4">
                  <span className="text-[12px] font-medium text-[#666666] transition-colors group-hover:text-ink">
                    O‘rganishni boshlash
                  </span>

                  <ArrowUpRight className="h-4 w-4 text-[#999999] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* FOOTER */}
        {!loading && !error && books.length > 0 && (
          <div className="mt-8 flex flex-col justify-between gap-2 border-t border-rule pt-5 text-[12px] text-[#888888] sm:flex-row sm:items-center">
            <span>
              Showing {books.length} of {books.length} books
            </span>

            <span>
              LinguaCoach AI · Vocabulary Learning
            </span>
          </div>
        )}
      </main>
    </div>
  );
}
