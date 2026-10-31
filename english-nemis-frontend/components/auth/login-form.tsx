"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  ArrowRight,
  Eye,
  EyeOff,
  Languages,
  Loader2,
} from "lucide-react";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginValues) => {
    setServerError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setServerError(
          result.message || "Invalid email or password",
        );
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setServerError(
        "Unable to connect to the server. Please try again.",
      );
    }
  };

  return (
    <div className="w-full max-w-[360px]">
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="mb-5 flex size-10 items-center justify-center rounded-lg bg-black text-white">
          <Languages size={21} strokeWidth={1.8} />
        </div>

        <h1 className="text-[24px] font-semibold tracking-[-0.04em] text-ink">
          LinguaCoach AI
        </h1>

        <p className="mt-2 text-[13px] text-ink-3">
          Sign in to your account
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {/* Email */}
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-[13px] font-medium text-ink"
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={
              errors.email ? "email-error" : undefined
            }
            {...register("email")}
            className="h-10 w-full rounded-md border border-[#e5e5e5] bg-white px-3 text-[13px] text-ink outline-none transition-colors placeholder:text-muted focus:border-ink-3 focus:ring-2 focus:ring-black/5"
          />

          {errors.email && (
            <p
              id="email-error"
              role="alert"
              className="text-xs text-red-600"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-[13px] font-medium text-ink"
          >
            Password
          </label>

          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? "password-error" : undefined
              }
              {...register("password")}
              className="h-10 w-full rounded-md border border-[#e5e5e5] bg-white px-3 pr-10 text-[13px] text-ink outline-none transition-colors placeholder:text-muted focus:border-ink-3 focus:ring-2 focus:ring-black/5"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={
                showPassword ? "Hide password" : "Show password"
              }
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-3 flex items-center text-ink-3 hover:text-black"
            >
              {showPassword ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
              )}
            </button>
          </div>

          {errors.password && (
            <p
              id="password-error"
              role="alert"
              className="text-xs text-red-600"
            >
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Server Error */}
        {serverError && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-600"
          >
            {serverError}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-ink text-[13px] font-medium text-white transition-colors hover:bg-[#404040] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2
                size={15}
                className="animate-spin"
              />
              Signing in...
            </>
          ) : (
            <>
              Continue
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-neutral-500">
        Akkauntingiz yo‘qmi?{" "}
        <a
          href="/signup"
          className="font-medium text-neutral-900 underline underline-offset-2"
        >
          Sign up
        </a>
      </p>

      {/* Footer */}
      <p className="mt-10 text-center text-xs text-muted">
        © {new Date().getFullYear()} LinguaCoach AI
      </p>
    </div>
  );
}