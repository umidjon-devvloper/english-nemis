import mongoose from "mongoose";

/**
 * One listening-practice clip: short native-speaker MP3 + full transcript
 * + comprehension questions. Audio lives either on an external CC/public
 * domain host or on our own R2 bucket (preferred for reliability).
 */
const questionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true },
    options: { type: [String], required: true },
    answer: { type: String, required: true },
    explanationUz: { type: String, default: "" },
  },
  { _id: true },
);

const listeningClipSchema = new mongoose.Schema(
  {
    language: {
      type: String,
      enum: ["english", "german"],
      required: true,
      index: true,
    },

    level: {
      type: String,
      enum: ["A1", "A2", "B1", "B2", "C1", "C2"],
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
    },

    transcript: {
      type: String,
      required: true,
    },

    translationUz: {
      type: String,
      default: "",
    },

    // Short topical tag ("news", "dialogue", "story", "lesson")
    kind: {
      type: String,
      default: "lesson",
    },

    // Approx length in seconds
    durationSec: {
      type: Number,
      default: 0,
    },

    // Audio URL — R2 CDN preferred; falls back to source URL during migration
    audioUrl: {
      type: String,
      required: true,
    },

    // Where this clip originated (for attribution)
    source: {
      name: { type: String, default: "" },
      url: { type: String, default: "" },
      license: { type: String, default: "" }, // "public domain", "CC-BY", ...
    },

    questions: {
      type: [questionSchema],
      default: [],
    },

    published: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

listeningClipSchema.index({ language: 1, level: 1, published: 1 });

export default mongoose.models.ListeningClip ||
  mongoose.model("ListeningClip", listeningClipSchema);
