import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/User.js";

async function seedAdmin() {
  try {
    const {
      MONGODB_URI,
      SEED_ADMIN_EMAIL,
      SEED_ADMIN_NAME,
      SEED_ADMIN_PASSWORD,
    } = process.env;

    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is required");
    }

    if (!SEED_ADMIN_EMAIL) {
      throw new Error("SEED_ADMIN_EMAIL is required");
    }

    if (!SEED_ADMIN_PASSWORD || SEED_ADMIN_PASSWORD.length < 12) {
      throw new Error(
        "SEED_ADMIN_PASSWORD must contain at least 12 characters"
      );
    }

    await mongoose.connect(MONGODB_URI);

    console.log("MongoDB connected");

    const email = SEED_ADMIN_EMAIL.trim().toLowerCase();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log("Admin email already exists. No changes made.");
      return;
    }

    const passwordHash = await bcrypt.hash(
      SEED_ADMIN_PASSWORD,
      12
    );

    const admin = await User.create({
      displayName: SEED_ADMIN_NAME || "LinguaCoach Admin",
      email,
      passwordHash,
      role: "admin",

      timezone: "Asia/Tashkent",
      preferredExplanationLanguage: "uz",

      dailyTargetMinutes: 270,
      minimumTargetMinutes: 240,
      extendedTargetMinutes: 300,

      englishLevelEstimate: "B1-B2",
      germanLevelEstimate: "A0",

      learningGoals: {
        english: [
          "Speaking",
          "Listening",
          "Grammar",
          "Vocabulary",
          "IELTS",
        ],
        german: [
          "Vocabulary",
          "Grammar",
          "Speaking",
          "Listening",
        ],
      },
    });

    console.log("Admin created successfully");
    console.log("Admin ID:", admin._id.toString());
    console.log("Admin email:", admin.email);
  } catch (error) {
    console.error("Admin seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedAdmin();