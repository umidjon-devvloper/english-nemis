export type VocabularyBook = {
  _id: string;
  language: "english" | "german";
  title: string;
  slug: string;
  bookNumber: number;
  level: string;
  description: string;
  totalUnits: number;
  order: number;
};

export type VocabularyUnit = {
  _id: string;
  book: string;
  unitNumber: number;
  title: string;
  description: string;
  totalWords: number;
};

export type VocabularyWord = {
  _id: string;
  language?: "english" | "german";
  word: string;
  translationUz: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  exampleUz: string;
  article?: string;
  plural?: string;
  order: number;
};

export type VocabularyExercise = {
  id?: string;
  _id?: string;
  type: string;
  section: string;
  question: string;
  options: string[];
  order: number;
};

export type ReadingQuestion = {
  _id?: string;
  question: string;
  options: string[];
};

export type VocabularyReading = {
  _id: string;
  title: string;
  content: string;
  translationUz: string;
  questions: ReadingQuestion[];
};

export type BooksResponse = {
  success: boolean;
  books: VocabularyBook[];
};

export type UnitResponse = {
  success: boolean;
  unit: {
    _id: string;
    unitNumber: number;
    title: string;
    totalWords: number;
  };
  words: {
    _id: string;
    word: string;
    translationUz: string;
    pronunciation: string;
    example: string;
    exampleUz: string;
  }[];
  exercises: unknown[];
  reading: {
    title: string;
    content: string;
    questions: unknown[];
  } | null;
};

export type UnitDetailResponse = {
  success: boolean;
  unit: VocabularyUnit;
  words: VocabularyWord[];
  exercises: VocabularyExercise[];
  reading: VocabularyReading | null;
};