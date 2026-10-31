import mongoose from "mongoose";

const studySessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Local YYYY-MM-DD in the user's timezone when the session happened.
    date: {
      type: String,
      required: true,
      index: true,
    },

    language: {
      type: String,
      enum: ["english", "german"],
      required: true,
    },

    // "vocabulary", "task", "practice", "reading", "writing"...
    activity: {
      type: String,
      required: true,
    },

    // Optional reference to the DailyTask or VocabularyUnit this session covered.
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    durationMinutes: {
      type: Number,
      required: true,
      min: 0,
      max: 600,
    },

    // Only set for exercise-type sessions.
    correctAnswers: {
      type: Number,
      default: null,
    },

    totalAnswers: {
      type: Number,
      default: null,
    },

    startedAt: {
      type: Date,
      default: () => new Date(),
    },

    endedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
  },
);

studySessionSchema.index({ user: 1, date: 1 });

export default mongoose.models.StudySession ||
  mongoose.model("StudySession", studySessionSchema);
