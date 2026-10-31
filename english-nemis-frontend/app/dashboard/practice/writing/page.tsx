import { redirect } from "next/navigation";

import { getCurrentUser } from "../../../lib/auth/session";
import { WritingSession } from "../../../../components/practice/writing-session";

export default async function PracticeWritingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <div className="min-h-full bg-white">
      <WritingSession
        englishLevel={user.englishLevelEstimate || "B1"}
        germanLevel={user.germanLevelEstimate || "A1"}
      />
    </div>
  );
}
