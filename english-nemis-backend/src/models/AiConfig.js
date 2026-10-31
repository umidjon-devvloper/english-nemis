import mongoose from "mongoose";

const providerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ["gemini", "claude", "openai"],
      required: true,
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    model: {
      type: String,
      required: true,
    },

    priority: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const aiConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "global",
      unique: true,
    },

    providers: {
      type: [providerSchema],
      default: [
        {
          name: "gemini",
          enabled: true,
          model: "gemini-2.5-flash",
          priority: 1,
        },
        {
          name: "claude",
          enabled: true,
          model: "claude-sonnet-4-5",
          priority: 2,
        },
        {
          name: "openai",
          enabled: true,
          model: "gpt-5-mini",
          priority: 3,
        },
      ],
    },

    fallbackEnabled: {
      type: Boolean,
      default: true,
    },

    timeoutMs: {
      type: Number,
      default: 20000,
    },

    maxOutputTokens: {
      type: Number,
      default: 4000,
    },

    dailyRequestLimit: {
      type: Number,
      default: 100,
    },

    autoGenerate: {
      type: Boolean,
      default: true,
    },

    generationTime: {
      type: String,
      default: "00:05",
    },

    timezone: {
      type: String,
      default: "Asia/Tashkent",
    },

    english: {
      level: {
        type: String,
        default: "B1-B2",
      },
      dailyMinutes: {
        type: Number,
        default: 150,
      },
      exercisesPerDay: {
        type: Number,
        default: 8,
      },
    },

    german: {
      level: {
        type: String,
        default: "A0",
      },
      dailyMinutes: {
        type: Number,
        default: 120,
      },
      exercisesPerDay: {
        type: Number,
        default: 8,
      },
    },

    exerciseTypes: {
      type: [String],
      default: [
        "fill_blank",
        "multiple_choice",
        "translation",
        "sentence_building",
        "grammar_correction",
        "reading",
        "writing",
      ],
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.AiConfig ||
  mongoose.model("AiConfig", aiConfigSchema);