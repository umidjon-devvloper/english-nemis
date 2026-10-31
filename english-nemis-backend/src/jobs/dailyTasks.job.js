import cron from "node-cron";
import { generateDailyTasksForAllUsers } from "../services/ai/task-generator.js";

export function startDailyTasksJob() {
  cron.schedule(
    "5 0 * * *",
    async () => {
      console.log("Starting daily task generation...");

      try {
        const result = await generateDailyTasksForAllUsers();

        console.log("Daily generation result:", {
          date: result.date,
          totalUsers: result.totalUsers,
          generated: result.generated,
          failed: result.failed,
        });
      } catch (error) {
        console.error("Daily task generation failed:", error);
      }
    },
    {
      timezone: "Asia/Tashkent",
      noOverlap: true,
    },
  );
}