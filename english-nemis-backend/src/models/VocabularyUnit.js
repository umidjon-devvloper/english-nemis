import mongoose from "mongoose";

const vocabularyUnitSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VocabularyBook",
      required: true,
    },

    unitNumber: {
      type: Number,
      required: true,
    },

    title: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    totalWords: {
      type: Number,
      default: 20,
    },
  },
  { timestamps: true },
);

vocabularyUnitSchema.index(
  { book: 1, unitNumber: 1 },
  { unique: true },
);

export default mongoose.models.VocabularyUnit ||
  mongoose.model("VocabularyUnit", vocabularyUnitSchema);