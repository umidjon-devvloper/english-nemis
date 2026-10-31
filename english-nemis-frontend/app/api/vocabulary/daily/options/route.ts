import { NextRequest, NextResponse } from "next/server";

import {
  getSessionToken,
  SESSION_COOKIE,
} from "../../../../lib/auth/session";

const API_URL =
  process.env.API_INTERNAL_URL ?? "http://localhost:4000";

export async function GET(request: NextRequest) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const language = request.nextUrl.searchParams.get("language");
  const wordId = request.nextUrl.searchParams.get("wordId");

  if (!language || !wordId) {
    return NextResponse.json(
      { success: false, message: "Missing params" },
      { status: 400 },
    );
  }

  const response = await fetch(
    `${API_URL}/api/v1/vocabulary/daily/options?language=${encodeURIComponent(language)}&wordId=${encodeURIComponent(wordId)}`,
    {
      headers: {
        Cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
      },
      cache: "no-store",
    },
  );

  const data = await response.json().catch(() => null);
  return NextResponse.json(data ?? { success: false }, {
    status: response.status,
  });
}
