import { redirect } from "next/navigation";

import { getCurrentUser } from "../../../lib/auth/session";
import { ChatSession } from "../../../../components/practice/chat-session";

export default async function PracticeChatPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return (
    <div className="flex h-full min-h-[calc(100dvh-64px)] flex-col bg-white">
      <ChatSession
        englishLevel={user.englishLevelEstimate || "B1"}
        germanLevel={user.germanLevelEstimate || "A1"}
      />
    </div>
  );
}
