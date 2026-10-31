import mongoose from "mongoose";

const vocabularyWordSchema = new mongoose.Schema(
  {
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VocabularyUnit",
      required: true,
      index: true,
    },

    language: {
      type: String,
      enum: ["english", "german"],
      required: true,
    },

    word: {
      type: String,
      required: true,
    },

    translationUz: {
      type: String,
      default: "",
    },

    pronunciation: {
      type: String,
      default: "",
    },

    partOfSpeech: {
      type: String,
      default: "",
    },

    definition: {
      type: String,
      default: "",
    },

    example: {
      type: String,
      default: "",
    },

    exampleUz: {
      type: String,
      default: "",
    },

    article: {
      type: String,
      default: "",
    },

    plural: {
      type: String,
      default: "",
    },

    order: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

vocabularyWordSchema.index(
  { unit: 1, order: 1 },
  { unique: true },
);

export default mongoose.models.VocabularyWord ||
  mongoose.model("VocabularyWord", vocabularyWordSchema);