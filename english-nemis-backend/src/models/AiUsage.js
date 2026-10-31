import mongoose from "mongoose";

const aiUsageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    provider: {
      type: String,
      enum: ["gemini", "claude", "openai"],
      required: true,
      index: true,
    },

    model: {
      type: String,
      required: true,
    },

    purpose: {
      type: String,
      enum: [
        "daily_tasks",
        "chat",
        "speaking",
        "writing",
        "translation",
        "grammar",
        "other",
      ],
      default: "other",
    },

    status: {
      type: String,
      enum: ["success", "failed"],
      required: true,
    },

    // Token usage
    inputTokens: {
      type: Number,
      default: 0,
      min: 0,
    },

    outputTokens: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalTokens: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Estimated API cost in USD
    estimatedCostUsd: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Response time
    durationMs: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Fallback information
    fallbackUsed: {
      type: Boolean,
      default: false,
    },

    attemptNumber: {
      type: Number,
      default: 1,
      min: 1,
    },

    // Error information
    errorCode: {
      type: String,
      default: null,
    },

    errorMessage: {
      type: String,
      default: null,
    },

    // Group attempts belonging to the same AI request
    requestId: {
      type: String,
      required: true,
      index: true,
    },

    // Date in configured timezone
    date: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

aiUsageSchema.index({ date: 1, provider: 1 });

aiUsageSchema.index({ createdAt: -1 });

aiUsageSchema.index({ requestId: 1, attemptNumber: 1 }, {
  unique: true,
});

export default mongoose.models.AiUsage ||
  mongoose.model("AiUsage", aiUsageSchema);