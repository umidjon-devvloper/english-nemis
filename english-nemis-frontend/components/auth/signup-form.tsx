"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Languages,
  Loader2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const signupSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Kamida 2 belgi")
    .max(80, "Juda uzun"),
  email: z.email("To‘g‘ri email kiriting"),
  password: z
    .string()
    .min(8, "Kamida 8 belgi")
    .max(128, "Juda uzun"),
});

type SignupValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { displayName: "", email: "", password: "" },
  });

  const onSubmit = async (data: SignupValues) => {
    setServerError("");

    try {
      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const registerResult = await registerResponse.json();

      if (!registerResponse.ok || !registerResult.success) {
        setServerError(
          registerResult.message || "Ro‘yxatdan o‘tib bo‘lmadi",
        );
        return;
      }

      // Auto-login
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const loginResult = await loginResponse.json();

      if (!loginResponse.ok || !loginResult.success) {
        setServerError(
          "Akkaunt yaratildi, lekin avtomatik kirishda xatolik. Login sahifasidan qayta kiring.",
        );
        setTimeout(() => router.push("/"), 1500);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setServerError("Server bilan bog‘lanib bo‘lmadi");
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl bg-neutral-900 text-white">
          <Languages size={22} />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Create your account
        </h1>

        <p className="mt-2 text-sm text-neutral-500">
          LinguaCoach AI’da ro‘yxatdan o‘ting — EN va DE o‘rganing
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-700">
            Ismingiz
          </span>
          <input
            type="text"
            autoComplete="name"
            placeholder="Umidjon Afforov"
            {...register("displayName")}
            className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
          />
          {errors.displayName && (
            <p className="mt-1 text-xs text-red-600">
              {errors.displayName.message}
            </p>
          )}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-700">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register("email")}
            className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">
              {errors.email.message}
            </p>
          )}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-700">
            Parol
          </span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Kamida 8 belgi"
              {...register("password")}
              className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 pr-10 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label="Toggle password"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">
              {errors.password.message}
            </p>
          )}
        </label>

        {serverError && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              Continue
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-neutral-500">
        Akkauntingiz bormi?{" "}
        <Link
          href="/"
          className="font-medium text-neutral-900 underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
