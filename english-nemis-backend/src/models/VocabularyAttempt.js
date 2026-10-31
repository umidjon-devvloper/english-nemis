import mongoose from "mongoose";

const vocabularyAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VocabularyUnit",
      required: true,
    },

    language: {
      type: String,
      enum: ["english", "german"],
      required: true,
    },

    total: {
      type: Number,
      required: true,
    },

    correct: {
      type: Number,
      required: true,
    },

    answers: {
      type: [
        {
          exerciseId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
          },
          userAnswer: {
            type: String,
            default: "",
          },
          correct: {
            type: Boolean,
            required: true,
          },
        },
      ],
      default: [],
    },

    durationSeconds: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

vocabularyAttemptSchema.index({ user: 1, unit: 1, createdAt: -1 });

export default mongoose.models.VocabularyAttempt ||
  mongoose.model("VocabularyAttempt", vocabularyAttemptSchema);
