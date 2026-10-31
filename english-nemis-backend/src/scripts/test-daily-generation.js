import "dotenv/config";
import mongoose from "mongoose";

import {
  generateDailyTasksForAllUsers,
} from "../services/ai/task-generator.js";

async function main() {
  try {
    const mongoUri =
      process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("MongoDB connection URL topilmadi");
    }

    await mongoose.connect(mongoUri);

    console.log("MongoDB connected");

    const result = await generateDailyTasksForAllUsers();

    console.log(
      "GENERATION RESULT:",
      JSON.stringify(result, null, 2)
    );
  } catch (error) {
    console.error("GENERATION ERROR:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();