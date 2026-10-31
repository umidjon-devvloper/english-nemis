import { redirect } from "next/navigation";

import { getCurrentUser } from "../../../lib/auth/session";
import { ListeningSession } from "../../../../components/practice/listening-session";

export default async function PracticeListeningPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <div className="min-h-full bg-white">
      <ListeningSession
        englishLevel={user.englishLevelEstimate || "B1"}
        germanLevel={user.germanLevelEstimate || "A1"}
      />
    </div>
  );
}
