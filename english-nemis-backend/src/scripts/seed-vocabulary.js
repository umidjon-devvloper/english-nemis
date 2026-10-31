import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

import VocabularyBook from "../models/VocabularyBook.js";
import VocabularyUnit from "../models/VocabularyUnit.js";
import VocabularyWord from "../models/VocabularyWord.js";
import VocabularyExercise from "../models/VocabularyExercise.js";
import VocabularyReading from "../models/VocabularyReading.js";

// ============================================================
// CONFIG
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --language=english | german
const cliArg = process.argv
  .slice(2)
  .find((arg) => arg.startsWith("--language="));

const LANGUAGE = (cliArg?.split("=")[1] ?? "english").trim();

if (!["english", "german"].includes(LANGUAGE)) {
  throw new Error(
    `Unsupported language "${LANGUAGE}". Use --language=english or --language=german`
  );
}

const LANGUAGE_CONFIG = {
  english: {
    directory: "english",
    filePrefix: "essential",
    bookTitle: (n) => `Essential ${n}`,
    description: (title) => `English vocabulary — ${title}`,
    books: [
      { number: 1, level: "A1" },
      { number: 2, level: "A2" },
      { number: 3, level: "B1" },
      { number: 4, level: "B1" },
      { number: 5, level: "B2" },
      { number: 6, level: "B2" },
    ],
  },
  german: {
    directory: "german",
    filePrefix: "grundwortschatz",
    bookTitle: (n) => `Grundwortschatz ${n}`,
    description: (title) => `Deutscher Wortschatz — ${title}`,
    books: [
      { number: 1, level: "A1" },
      { number: 2, level: "A2" },
      { number: 3, level: "B1" },
    ],
  },
};

const CONFIG = LANGUAGE_CONFIG[LANGUAGE];

const DATA_DIRECTORY = path.resolve(
  __dirname,
  `../../data/vocabulary/${CONFIG.directory}`
);

const BOOKS = CONFIG.books;

// Darajalar ilova uchun taxminiy tasnif.
const TOTAL_UNITS = 30;
const WORDS_PER_UNIT = 20;

const EXERCISE_TYPES = new Set([
  "fill_blank",
  "multiple_choice",
  "matching",
  "word_form",
  "true_false",
  "short_answer",
]);

// ============================================================
// HELPERS
// ============================================================

function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value, fallback = "") {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
}

function firstNonEmptyString(...values) {
  for (const value of values) {
    const result = asString(value);

    if (result) {
      return result;
    }
  }

  return "";
}

function toPositiveInteger(value, fallback) {
  const number = Number(value);

  if (Number.isInteger(number) && number > 0) {
    return number;
  }

  return fallback;
}

function uniqueByOrder(items, context) {
  const seen = new Set();

  for (const item of items) {
    if (seen.has(item.order)) {
      throw new Error(
        `${context}: duplicate order ${item.order}`
      );
    }

    seen.add(item.order);
  }

  return items;
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((option) => {
      if (typeof option === "string") {
        return option.trim();
      }

      if (typeof option === "number") {
        return String(option);
      }

      if (isObject(option)) {
        return firstNonEmptyString(
          option.text,
          option.label,
          option.value,
          option.option
        );
      }

      return "";
    })
    .filter(Boolean);
}

function normalizeAnswerKey(exercise) {
  if (
    exercise.answerKey !== undefined &&
    exercise.answerKey !== null
  ) {
    const key = exercise.answerKey;

    if (isObject(key)) {
      return key;
    }

    return {
      correctAnswer: key,
    };
  }

  const answer =
    exercise.correctAnswer ??
    exercise.answer ??
    exercise.correct ??
    exercise.solution;

  if (answer === undefined || answer === null) {
    return null;
  }

  return {
    correctAnswer: answer,
  };
}

// ============================================================
// NORMALIZE WORD
// ============================================================

function normalizeWord(word, index, context) {
  if (typeof word === "string") {
    word = { word };
  }

  if (!isObject(word)) {
    console.warn(
      `⚠️ ${context}: invalid word at index ${index + 1}`
    );

    return null;
  }

  const text = firstNonEmptyString(
    word.word,
    word.english,
    word.term,
    word.text,
    word.vocabulary
  );

  if (!text) {
    console.warn(
      `⚠️ ${context}: word missing at index ${index + 1}`
    );

    return null;
  }

  return {
    order: toPositiveInteger(word.order, index + 1),

    word: text,

    translationUz: firstNonEmptyString(
      word.translationUz,
      word.uzbek,
      word.translation,
      word.meaningUz,
      word.meaning_uz
    ),

    pronunciation: firstNonEmptyString(
      word.pronunciation,
      word.phonetic,
      word.ipa
    ),

    partOfSpeech: firstNonEmptyString(
      word.partOfSpeech,
      word.pos,
      word.wordType
    ),

    definition: firstNonEmptyString(
      word.definition,
      word.meaning,
      word.description
    ),

    example: firstNonEmptyString(
      word.example,
      word.exampleSentence,
      word.sentence
    ),

    exampleUz: firstNonEmptyString(
      word.exampleUz,
      word.exampleTranslation,
      word.sentenceUz
    ),

    article: firstNonEmptyString(
      word.article,
      word.gender,
      word.der
    ),

    plural: firstNonEmptyString(
      word.plural,
      word.pluralForm,
      word.pl
    ),
  };
}

// ============================================================
// NORMALIZE EXERCISE
// ============================================================

function normalizeExercise(exercise, index, context) {
  if (!isObject(exercise)) {
    console.warn(
      `⚠️ ${context}: invalid exercise at index ${index + 1}`
    );

    return null;
  }

  let type = firstNonEmptyString(
    exercise.type,
    exercise.exerciseType,
    exercise.kind
  ).toLowerCase();

  const typeAliases = {
    fill_in_blank: "fill_blank",
    fill_in_the_blank: "fill_blank",
    fill_in_the_blanks: "fill_blank",
    fill_blanks: "fill_blank",
    fillblank: "fill_blank",
    multiplechoice: "multiple_choice",
    mcq: "multiple_choice",
    choose: "multiple_choice",
    match: "matching",
    truefalse: "true_false",
    shortanswer: "short_answer",
    translate: "short_answer",
    translation: "short_answer",
    wordform: "word_form",
    gap: "fill_blank",
    cloze: "fill_blank",
  };

  type = typeAliases[type] ?? type;

  if (!type) {
    type = "fill_blank";
  }

  if (!EXERCISE_TYPES.has(type)) {
    console.warn(
      `⚠️ ${context}: unsupported exercise type "${type}"`
    );

    return null;
  }

  const question = firstNonEmptyString(
    exercise.question,
    exercise.sentence,
    exercise.prompt,
    exercise.text,
    exercise.instruction,
    exercise.instructionText
  );

  if (!question) {
    console.warn(
      `⚠️ ${context}: exercise ${index + 1} has no question; skipped`
    );

    return null;
  }

  const answerKey = normalizeAnswerKey(exercise);

  if (!answerKey) {
    console.warn(
      `⚠️ ${context}: exercise ${index + 1} has no answer; skipped`
    );

    return null;
  }

  return {
    order: toPositiveInteger(
      exercise.order,
      index + 1
    ),

    type,

    section: firstNonEmptyString(
      exercise.section,
      exercise.category,
      exercise.group
    ),

    question,

    options: normalizeOptions(
      exercise.options ??
      exercise.choices ??
      exercise.answers
    ),

    answerKey,

    explanationUz: firstNonEmptyString(
      exercise.explanationUz,
      exercise.explanation,
      exercise.feedbackUz
    ),
  };
}

// ============================================================
// NORMALIZE READING
// ============================================================

function normalizeReading(reading, context) {
  if (!isObject(reading)) {
    return null;
  }

  const title = firstNonEmptyString(
    reading.title,
    reading.name,
    reading.heading
  );

  const content = firstNonEmptyString(
    reading.content,
    reading.story,
    reading.text,
    reading.passage
  );

  if (!title || !content) {
    console.warn(
      `⚠️ ${context}: reading title/content missing; skipped`
    );

    return null;
  }

  const questions = asArray(
    reading.questions ??
    reading.comprehensionQuestions
  );

  const normalizedQuestions = questions
    .map((question, index) => {
      if (!isObject(question)) {
        return null;
      }

      const questionText = firstNonEmptyString(
        question.question,
        question.text,
        question.prompt
      );

      if (!questionText) {
        console.warn(
          `⚠️ ${context}: reading question ${index + 1} skipped`
        );

        return null;
      }

      const answerKey = normalizeAnswerKey(question);

      return {
        question: questionText,
        options: normalizeOptions(
          question.options ?? question.choices
        ),
        ...(answerKey ? { answerKey } : {}),
      };
    })
    .filter(Boolean);

  return {
    title,

    content,

    translationUz: firstNonEmptyString(
      reading.translationUz,
      reading.uzbek,
      reading.translation
    ),

    questions: normalizedQuestions,
  };
}

// ============================================================
// LOAD JSON
// ============================================================

async function loadBookData(bookNumber) {
  const filename = `${CONFIG.filePrefix}-${bookNumber}.json`;

  const filepath = path.join(
    DATA_DIRECTORY,
    filename
  );

  let content;

  try {
    content = await fs.readFile(filepath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn(
        `⚠️ ${filename} not found; creating empty units`
      );

      return {
        bookNumber,
        units: [],
      };
    }

    throw error;
  }

  let data;

  try {
    data = JSON.parse(content);
  } catch (error) {
    throw new Error(
      `${filename}: invalid JSON — ${error.message}`
    );
  }

  if (!isObject(data)) {
    throw new Error(
      `${filename}: root must be an object`
    );
  }

  if (
    data.bookNumber !== undefined &&
    Number(data.bookNumber) !== bookNumber
  ) {
    throw new Error(
      `${filename}: expected bookNumber ${bookNumber}`
    );
  }

  const rawUnits = asArray(data.units);
  const normalizedUnits = [];
  const seenUnits = new Set();

  for (let index = 0; index < rawUnits.length; index++) {
    const rawUnit = rawUnits[index];

    if (!isObject(rawUnit)) {
      console.warn(
        `⚠️ ${filename}: invalid unit at index ${index + 1}`
      );

      continue;
    }

    const unitNumber = toPositiveInteger(
      rawUnit.unitNumber ?? rawUnit.unit,
      index + 1
    );

    if (
      unitNumber < 1 ||
      unitNumber > TOTAL_UNITS
    ) {
      throw new Error(
        `${filename}: invalid unit ${unitNumber}`
      );
    }

    if (seenUnits.has(unitNumber)) {
      throw new Error(
        `${filename}: duplicate unit ${unitNumber}`
      );
    }

    seenUnits.add(unitNumber);

    const context = `Essential ${bookNumber}, Unit ${unitNumber}`;

    const words = asArray(
      rawUnit.words ??
      rawUnit.vocabulary ??
      rawUnit.wordList
    )
      .map((word, wordIndex) =>
        normalizeWord(word, wordIndex, context)
      )
      .filter(Boolean);

    const exercises = asArray(
      rawUnit.exercises ??
      rawUnit.tasks ??
      rawUnit.practice
    )
      .map((exercise, exerciseIndex) =>
        normalizeExercise(
          exercise,
          exerciseIndex,
          context
        )
      )
      .filter(Boolean);

    uniqueByOrder(words, `${context} words`);

    uniqueByOrder(
      exercises,
      `${context} exercises`
    );

    const reading = normalizeReading(
      rawUnit.reading ??
      rawUnit.story ??
      rawUnit.passage,
      context
    );

    normalizedUnits.push({
      unitNumber,

      title: firstNonEmptyString(
        rawUnit.title,
        rawUnit.name
      ) || `Unit ${unitNumber}`,

      description: firstNonEmptyString(
        rawUnit.description,
        rawUnit.subtitle
      ),

      words,
      exercises,
      reading,
    });
  }

  return {
    bookNumber,
    units: normalizedUnits,
  };
}

// ============================================================
// SEED BOOK
// ============================================================

async function seedBook(bookConfig) {
  const { number, level } = bookConfig;

  const slug = `${CONFIG.filePrefix}-${number}`;
  const title = CONFIG.bookTitle(number);

  console.log(`\n📚 Importing ${title}...`);

  // JSON avval tekshiriladi.
  const bookData = await loadBookData(number);

  const book = await VocabularyBook.findOneAndUpdate(
    {
      language: LANGUAGE,
      slug,
    },
    {
      $set: {
        language: LANGUAGE,
        title,
        slug,
        bookNumber: number,
        level,
        description: CONFIG.description(title),
        totalUnits: TOTAL_UNITS,
        order: number,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  const unitsByNumber = new Map(
    bookData.units.map((unit) => [
      unit.unitNumber,
      unit,
    ])
  );

  const stats = {
    book: title,
    units: 0,
    words: 0,
    exercises: 0,
    readings: 0,
  };

  for (
    let unitNumber = 1;
    unitNumber <= TOTAL_UNITS;
    unitNumber++
  ) {
    const source = unitsByNumber.get(unitNumber);

    const unitUpdate = {
      $setOnInsert: {
        book: book._id,
        unitNumber,
      },
    };

    // JSON'da mavjud unitlar yangilanadi.
    // Mavjud bo'lmagan unitlar tarkibi o'chirilmaydi.
    if (source) {
      unitUpdate.$set = {
        title: source.title,
        description: source.description,
        totalWords: source.words.length,
      };
    }

    const unit = await VocabularyUnit.findOneAndUpdate(
      {
        book: book._id,
        unitNumber,
      },
      unitUpdate,
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    stats.units++;

    if (!source) {
      continue;
    }

    // --------------------------------------------------------
    // WORDS
    // --------------------------------------------------------

    if (source.words.length > 0) {
      const operations = source.words.map((word) => ({
        updateOne: {
          filter: {
            unit: unit._id,
            order: word.order,
          },

          update: {
            $set: {
              language: LANGUAGE,
              word: word.word,
              translationUz: word.translationUz,
              pronunciation: word.pronunciation,
              partOfSpeech: word.partOfSpeech,
              definition: word.definition,
              example: word.example,
              exampleUz: word.exampleUz,
              article: word.article,
              plural: word.plural,
              order: word.order,
            },

            $setOnInsert: {
              unit: unit._id,
            },
          },

          upsert: true,
        },
      }));

      await VocabularyWord.bulkWrite(operations, {
        ordered: true,
      });

      stats.words += source.words.length;
    }

    // --------------------------------------------------------
    // EXERCISES
    // --------------------------------------------------------

    if (source.exercises.length > 0) {
      const operations = source.exercises.map(
        (exercise) => ({
          updateOne: {
            filter: {
              unit: unit._id,
              order: exercise.order,
            },

            update: {
              $set: {
                type: exercise.type,
                section: exercise.section,
                question: exercise.question,
                options: exercise.options,
                answerKey: exercise.answerKey,
                explanationUz:
                  exercise.explanationUz,
                order: exercise.order,
              },

              $setOnInsert: {
                unit: unit._id,
              },
            },

            upsert: true,
          },
        })
      );

      await VocabularyExercise.bulkWrite(
        operations,
        {
          ordered: true,
        }
      );

      stats.exercises += source.exercises.length;
    }

    // --------------------------------------------------------
    // READING
    // --------------------------------------------------------

    if (source.reading) {
      await VocabularyReading.findOneAndUpdate(
        {
          unit: unit._id,
        },
        {
          $set: {
            title: source.reading.title,
            content: source.reading.content,
            translationUz:
              source.reading.translationUz,
            questions: source.reading.questions,
          },
        },
        {
          upsert: true,
          returnDocument: "after",
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      stats.readings++;
    }

    console.log(
      `  ✓ Unit ${unitNumber}: ` +
        `${source.words.length} words, ` +
        `${source.exercises.length} exercises, ` +
        `${source.reading ? 1 : 0} reading`
    );
  }

  console.log(
    `✅ ${title}: ${stats.words} words, ` +
      `${stats.exercises} exercises, ` +
      `${stats.readings} readings`
  );

  return stats;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI or MONGO_URI is missing in .env"
    );
  }

  console.log("📁 JSON directory:", DATA_DIRECTORY);

  await mongoose.connect(mongoUri);

  console.log("✅ MongoDB connected");
  console.log("🚀 Starting vocabulary seed...");

  const results = [];

  for (const book of BOOKS) {
    const result = await seedBook(book);
    results.push(result);
  }

  const totals = results.reduce(
    (acc, item) => {
      acc.units += item.units;
      acc.words += item.words;
      acc.exercises += item.exercises;
      acc.readings += item.readings;

      return acc;
    },
    {
      units: 0,
      words: 0,
      exercises: 0,
      readings: 0,
    }
  );

  console.log("\n====================================");
  console.log("🎉 VOCABULARY SEED COMPLETED");
  console.log("====================================");

  console.table(
    results.map((item) => ({
      Book: item.book,
      Units: item.units,
      Words: item.words,
      Exercises: item.exercises,
      Readings: item.readings,
    }))
  );

  console.log("Books:", BOOKS.length);
  console.log("Units:", totals.units);
  console.log("Imported words:", totals.words);
  console.log("Imported exercises:", totals.exercises);
  console.log("Imported readings:", totals.readings);

  const expectedWords =
    BOOKS.length *
    TOTAL_UNITS *
    WORDS_PER_UNIT;

  if (totals.words < expectedWords) {
    console.log(
      `\n⚠️ Vocabulary incomplete: ` +
        `${totals.words}/${expectedWords} words in JSON files.`
    );
  }

  console.log("\n✅ Done!");
}

// ============================================================
// RUN
// ============================================================

main()
  .catch((error) => {
    console.error(
      "\n❌ Vocabulary seed failed:",
      error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });