import mongoose from "mongoose";

const vocabularyBookSchema = new mongoose.Schema(
  {
    language: {
      type: String,
      enum: ["english", "german"],
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    slug: {
      type: String,
      required: true,
    },

    bookNumber: {
      type: Number,
      required: true,
    },

    level: {
      type: String,
      default: "B1",
    },

    description: {
      type: String,
      default: "",
    },

    totalUnits: {
      type: Number,
      default: 30,
    },

    order: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true },
);

vocabularyBookSchema.index(
  { language: 1, slug: 1 },
  { unique: true },
);

export default mongoose.models.VocabularyBook ||
  mongoose.model("VocabularyBook", vocabularyBookSchema);