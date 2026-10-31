import mongoose from "mongoose";

/**
 * One daily "pack" of ~100 vocabulary words for a user in one language.
 * The user drills these one by one; each entry tracks whether the word
 * has been answered yet (and whether the first attempt was correct).
 */
const packWordSchema = new mongoose.Schema(
  {
    wordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VocabularyWord",
      required: true,
    },

    word: String,
    translationUz: String,
    pronunciation: String,
    example: String,

    answered: {
      type: Boolean,
      default: false,
    },

    correct: {
      type: Boolean,
      default: null,
    },

    userAnswer: {
      type: String,
      default: "",
    },

    attempts: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);

const dailyVocabularySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: String,
      required: true,
    },

    language: {
      type: String,
      enum: ["english", "german"],
      required: true,
    },

    size: {
      type: Number,
      default: 100,
    },

    words: {
      type: [packWordSchema],
      default: [],
    },

    completed: {
      type: Boolean,
      default: false,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    score: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true },
);

dailyVocabularySchema.index(
  { user: 1, date: 1, language: 1 },
  { unique: true },
);

export default mongoose.models.DailyVocabulary ||
  mongoose.model("DailyVocabulary", dailyVocabularySchema);
