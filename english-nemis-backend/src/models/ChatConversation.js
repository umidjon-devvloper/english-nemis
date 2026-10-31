import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 4000,
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { _id: true },
);

const chatConversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    language: {
      type: String,
      enum: ["english", "german"],
      required: true,
    },

    title: {
      type: String,
      default: "",
      maxlength: 120,
    },

    messages: {
      type: [chatMessageSchema],
      default: [],
    },

    archived: {
      type: Boolean,
      default: false,
    },

    lastMessageAt: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
  },
  { timestamps: true },
);

chatConversationSchema.index({ user: 1, lastMessageAt: -1 });

export default mongoose.models.ChatConversation ||
  mongoose.model("ChatConversation", chatConversationSchema);
