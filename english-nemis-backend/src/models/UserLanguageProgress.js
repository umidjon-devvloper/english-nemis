import mongoose from "mongoose";

/**
 * Per-user, per-language gate for the daily 100-word quiz.
 *
 *   english: unlocked from the start.
 *   german:  unlocked only after the user hits a perfect (100%) daily
 *            pack in English — tracked here as `unlocked: true`.
 *
 * Also stores a lightweight learning history so the dashboard can
 * show which language is currently being drilled.
 */
const userLanguageProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    language: {
      type: String,
      enum: ["english", "german"],
      required: true,
    },

    unlocked: {
      type: Boolean,
      default: false,
    },

    unlockedAt: {
      type: Date,
      default: null,
    },

    packsCompleted: {
      type: Number,
      default: 0,
    },

    perfectPacks: {
      type: Number,
      default: 0,
    },

    lastPackScore: {
      type: Number,
      default: null,
    },

    lastPackDate: {
      type: String,
      default: null,
    },

    streakDays: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

userLanguageProgressSchema.index(
  { user: 1, language: 1 },
  { unique: true },
);

export default mongoose.models.UserLanguageProgress ||
  mongoose.model("UserLanguageProgress", userLanguageProgressSchema);
