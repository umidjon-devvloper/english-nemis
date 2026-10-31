import mongoose from "mongoose";

const userVocabularyProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    word: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VocabularyWord",
      required: true,
    },

    status: {
      type: String,
      enum: ["new", "learning", "review", "mastered"],
      default: "new",
    },

    correctAnswers: {
      type: Number,
      default: 0,
    },

    incorrectAnswers: {
      type: Number,
      default: 0,
    },

    lastReviewedAt: {
      type: Date,
      default: null,
    },

    nextReviewAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

userVocabularyProgressSchema.index(
  { user: 1, word: 1 },
  { unique: true },
);

export default mongoose.models.UserVocabularyProgress ||
  mongoose.model("UserVocabularyProgress", userVocabularyProgressSchema);