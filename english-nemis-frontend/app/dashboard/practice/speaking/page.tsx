import { redirect } from "next/navigation";

import { getCurrentUser } from "../../../lib/auth/session";
import { SpeakingSession } from "../../../../components/practice/speaking-session";

export default async function PracticeSpeakingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <div className="min-h-full bg-white">
      <SpeakingSession
        englishLevel={user.englishLevelEstimate || "B1"}
        germanLevel={user.germanLevelEstimate || "A1"}
      />
    </div>
  );
}
