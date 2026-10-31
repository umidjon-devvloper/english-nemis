import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "./lib/auth/session";
export const instant = false;
export const metadata: Metadata = {
  title: "Sign In | LinguaCoach AI",
  description: "Sign in to your LinguaCoach AI account.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-white px-4 py-12">
      <LoginForm />
    </main>
  );
}