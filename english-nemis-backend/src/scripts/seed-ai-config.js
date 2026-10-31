import "dotenv/config";
import mongoose from "mongoose";

import AiConfig from "../models/AiConfig.js";

async function main() {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("MongoDB URI topilmadi");
    }

    await mongoose.connect(mongoUri);

    console.log("MongoDB connected");

    const existing = await AiConfig.findOne({
      key: "global",
    });

    if (existing) {
      console.log("AI Config already exists");
      console.log(JSON.stringify(existing, null, 2));
      return;
    }

    const config = await AiConfig.create({
      key: "global",
    });

    console.log("AI Config created successfully");
    console.log(JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("AI Config seed error:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();