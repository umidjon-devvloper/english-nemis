import { redirect } from "next/navigation";

import { getCurrentUser } from "../../app/lib/auth/session";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { connection } from "next/server";
export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    await connection();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardShell user={user}>
      {children}
    </DashboardShell>
  );
}