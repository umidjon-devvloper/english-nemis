import { redirect } from "next/navigation";

import { getCurrentUser } from "../../../lib/auth/session";
import { DailyQuiz } from "../../../../components/vocabulary/daily-quiz";

export default async function DailyVocabPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <div className="min-h-full bg-white">
      <DailyQuiz />
    </div>
  );
}
