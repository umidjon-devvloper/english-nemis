import mongoose from "mongoose";

const vocabularyExerciseSchema = new mongoose.Schema(
  {
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VocabularyUnit",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "fill_blank",
        "multiple_choice",
        "matching",
        "word_form",
        "true_false",
        "short_answer",
      ],
      required: true,
    },

    section: {
      type: String,
      default: "",
    },

    question: {
      type: String,
      required: true,
    },

    options: {
      type: [String],
      default: [],
    },

    answerKey: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      select: false,
    },

    explanationUz: {
      type: String,
      default: "",
      select: false,
    },

    order: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

vocabularyExerciseSchema.index(
  { unit: 1, order: 1 },
  { unique: true },
);

export default mongoose.models.VocabularyExercise ||
  mongoose.model("VocabularyExercise", vocabularyExerciseSchema);