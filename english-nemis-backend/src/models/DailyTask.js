import mongoose from "mongoose";

const dailyTaskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyPlan",
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

    type: {
      type: String,
      enum: [
        "fill_blank",
        "multiple_choice",
        "translation",
        "sentence_building",
        "grammar_correction",
        "reading",
        "writing",
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    instructions: {
      type: String,
      default: "",
    },

    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    answerKey: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      select: false,
    },

    explanation: {
      type: String,
      default: "",
      select: false,
    },

    estimatedMinutes: {
      type: Number,
      default: 10,
    },

    order: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

dailyTaskSchema.index({
  user: 1,
  date: 1,
  language: 1,
});

export default mongoose.models.DailyTask ||
  mongoose.model("DailyTask", dailyTaskSchema);