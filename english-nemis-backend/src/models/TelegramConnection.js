import mongoose from "mongoose";

const telegramConnectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    chatId: {
      type: String,
      required: true,
      unique: true,
    },

    username: {
      type: String,
      default: null,
    },

    firstName: {
      type: String,
      default: null,
    },

    lastName: {
      type: String,
      default: null,
    },

    notificationsEnabled: {
      type: Boolean,
      default: true,
    },

    reminderHours: {
      type: [Number],
      default: [9, 15, 20],
    },
  },
  { timestamps: true },
);

export default mongoose.models.TelegramConnection ||
  mongoose.model("TelegramConnection", telegramConnectionSchema);