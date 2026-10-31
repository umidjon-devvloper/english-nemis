import mongoose from "mongoose";

const vocabularyReadingSchema = new mongoose.Schema(
  {
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VocabularyUnit",
      required: true,
      unique: true,
    },

    title: {
      type: String,
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    translationUz: {
      type: String,
      default: "",
    },

    questions: {
      type: [
        {
          question: String,
          options: [String],
          answerKey: {
            type: mongoose.Schema.Types.Mixed,
            select: false,
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.models.VocabularyReading ||
  mongoose.model("VocabularyReading", vocabularyReadingSchema);