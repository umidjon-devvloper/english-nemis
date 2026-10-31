import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/signup-form";
import { getCurrentUser } from "../lib/auth/session";

export const instant = false;

export const metadata: Metadata = {
  title: "Sign up | LinguaCoach AI",
  description: "Create a LinguaCoach AI account.",
};

export default async function SignupPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-white px-4 py-12">
      <SignupForm />
    </main>
  );
}
