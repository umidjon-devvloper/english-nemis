import DailyVocabulary from "../../models/DailyVocabulary.js";

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

export async function getNextQuestion(userId, date) {
  const daily = await DailyVocabulary.findOne({
    user: userId,
    date,
  });

  if (!daily) {
    throw new Error("DAILY_VOCABULARY_NOT_FOUND");
  }

  const pending = daily.words.filter(
    (item) => !item.mastered,
  );

  if (pending.length === 0) {
    return {
      completed: true,
      message: "All vocabulary mastered!",
    };
  }

  const current =
    pending[Math.floor(Math.random() * pending.length)];

  const alternatives = shuffle(
    daily.words.filter(
      (item) =>
        item.language === current.language &&
        item.wordId.toString() !== current.wordId.toString() &&
        item.translation !== current.translation,
    ),
  ).slice(0, 3);

  if (alternatives.length < 3) {
    throw new Error("NOT_ENOUGH_QUIZ_OPTIONS");
  }

  const options = shuffle([
    current.translation,
    ...alternatives.map((item) => item.translation),
  ]);

  return {
    completed: false,
    questionId: current.wordId.toString(),
    language: current.language,
    question: current.word,
    options,
    progress: {
      mastered: daily.words.filter((w) => w.mastered).length,
      total: daily.words.length,
    },
  };
}