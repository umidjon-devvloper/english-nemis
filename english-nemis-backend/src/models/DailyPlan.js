import mongoose from "mongoose";

const dailyPlanSchema = new mongoose.Schema(
  {
    // Foydalanuvchi
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Kunlik sana: 2026-10-18
    date: {
      type: String,
      required: true,
    },

    timezone: {
      type: String,
      default: "Asia/Tashkent",
    },

    // English kunlik maqsad
    englishTargetMinutes: {
      type: Number,
      default: 150,
      min: 0,
    },

    // German kunlik maqsad
    germanTargetMinutes: {
      type: Number,
      default: 120,
      min: 0,
    },

    // Rejaning holati
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },

    // AI vazifalarni yaratgan vaqt
    generatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Bir foydalanuvchi uchun bir kunda bitta reja
dailyPlanSchema.index(
  { user: 1, date: 1 },
  { unique: true },
);

const DailyPlan =
  mongoose.models.DailyPlan ||
  mongoose.model("DailyPlan", dailyPlanSchema);

export default DailyPlan;