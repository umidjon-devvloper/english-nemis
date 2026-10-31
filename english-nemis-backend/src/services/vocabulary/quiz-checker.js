import DailyVocabulary from "../../models/DailyVocabulary.js";

export async function checkVocabularyAnswer({
  userId,
  date,
  wordId,
  answer,
}) {
  const daily = await DailyVocabulary.findOne({
    user: userId,
    date,
  });

  if (!daily) {
    throw new Error("DAILY_VOCABULARY_NOT_FOUND");
  }

  const word = daily.words.find(
    (item) => item.wordId.toString() === wordId,
  );

  if (!word) {
    throw new Error("WORD_NOT_FOUND");
  }

  if (word.mastered) {
    return {
      correct: true,
      alreadyMastered: true,
    };
  }

  word.attempts += 1;

  const correct =
    word.translation.trim().toLowerCase() ===
    answer.trim().toLowerCase();

  if (correct) {
    word.mastered = true;
  }

  const mastered = daily.words.filter(
    (item) => item.mastered,
  ).length;

  if (mastered === daily.words.length) {
    daily.completed = true;
    daily.completedAt = new Date();
  }

  await daily.save();

  return {
    correct,
    correctAnswer: word.translation,
    mastered,
    total: daily.words.length,
    completed: daily.completed,
  };
}