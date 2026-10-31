import "server-only";

import { cookies } from "next/headers";
import { apiRequest } from "../api/server";

export const SESSION_COOKIE = "linguacoach_session";

export type LearningGoals = {
  english?: string[];
  german?: string[];
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role?: "admin" | "user";
  timezone?: string;
  preferredExplanationLanguage?: "uz" | "en" | "ru";
  dailyTargetMinutes?: number;
  minimumTargetMinutes?: number;
  extendedTargetMinutes?: number;
  dailyPackSize?: number;
  englishLevelEstimate?: string;
  germanLevelEstimate?: string;
  learningGoals?: LearningGoals;
};

type AuthResponse = {
  success: boolean;
  user: AuthUser;
};

export async function getSessionToken() {
  const cookieStore = await cookies();

  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getSessionToken();

  if (!token) {
    return null;
  }

  try {
    const response = await apiRequest<AuthResponse>(
      "/api/v1/auth/me",
      {
        cookie: `${SESSION_COOKIE}=${token}`,
      },
    );

    return response.user;
  } catch {
    return null;
  }
}
