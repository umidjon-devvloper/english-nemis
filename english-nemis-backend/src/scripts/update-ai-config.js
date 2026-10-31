import "dotenv/config";
import mongoose from "mongoose";
import AiConfig from "../models/AiConfig.js";

async function main() {
  try {
    const mongoUri =
      process.env.MONGODB_URI || process.env.MONGO_URI;

    await mongoose.connect(mongoUri);

    const config = await AiConfig.findOneAndUpdate(
      { key: "global" },
      {
        $set: {
          timeoutMs: 90000,
          maxOutputTokens: 6000,
        },
      },
      { returnDocument: "after" },
    );

    if (!config) {
      throw new Error("AI_CONFIG_NOT_FOUND");
    }

    console.log("AI Config updated:", {
      timeoutMs: config.timeoutMs,
      maxOutputTokens: config.maxOutputTokens,
    });
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();