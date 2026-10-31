import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    timezone: {
      type: String,
      default: "Asia/Tashkent",
    },

    preferredExplanationLanguage: {
      type: String,
      default: "uz",
    },

    dailyTargetMinutes: {
      type: Number,
      default: 270,
    },

    dailyPackSize: {
      type: Number,
      default: 100,
      min: 10,
      max: 300,
    },

    minimumTargetMinutes: {
      type: Number,
      default: 240,
    },

    extendedTargetMinutes: {
      type: Number,
      default: 300,
    },

    englishLevelEstimate: {
      type: String,
      default: "B1-B2",
    },

    germanLevelEstimate: {
      type: String,
      default: "A0",
    },

    learningGoals: {
      english: {
        type: [String],
        default: ["Speaking", "Listening", "Grammar", "Vocabulary"],
      },

      german: {
        type: [String],
        default: ["Vocabulary", "Grammar", "Speaking"],
      },
    },
role: {

  type: String,

  enum: ["admin", "user"],

  default: "user",

},
    telegramChatId: {
      type: String,
      default: null,
    },

    telegramLinkedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.User ||
  mongoose.model("User", userSchema);