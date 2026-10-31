import DailyVocabulary from "../../models/DailyVocabulary.js";

// Bu importni mavjud Vocabulary modelingga moslashtiramiz.
import VocabularyWord from "../../models/VocabularyWord.js";

function getToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function getRandomWords(language, limit) {
  const words = await VocabularyWord.aggregate([
    {
      $match: { language },
    },
    {
      $sample: { size: limit },
    },
  ]);

  return words.map((item) => ({
    wordId: item._id,
    word: item.word,
    translation: item.translation,
    language,
    mastered: false,
    attempts: 0,
  }));
}

export async function generateDailyVocabulary(userId) {
  const date = getToday();

  const existing = await DailyVocabulary.findOne({
    user: userId,
    date,
  });

  if (existing) {
    return existing;
  }

  const english = await getRandomWords("english", 20);
  const german = await getRandomWords("german", 20);

  const words = [...english, ...german];

  if (words.length !== 40) {
    throw new Error(
      `NOT_ENOUGH_VOCABULARY_WORDS: ${words.length}/40`,
    );
  }

  return DailyVocabulary.findOneAndUpdate(
    { user: userId, date },
    {
      $setOnInsert: {
        user: userId,
        date,
        words,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    },
  );
}

export async function getDailyVocabulary(userId) {
  return DailyVocabulary.findOne({
    user: userId,
    date: getToday(),
  });
}