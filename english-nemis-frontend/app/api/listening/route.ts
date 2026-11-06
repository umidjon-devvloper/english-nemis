import { NextRequest, NextResponse } from "next/server";

import {
  getSessionToken,
  SESSION_COOKIE,
} from "../../lib/auth/session";

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
  const level = request.nextUrl.searchParams.get("level");
  const query = new URLSearchParams();
  if (language) query.set("language", language);
  if (level) query.set("level", level);
  const suffix = query.toString() ? `?${query.toString()}` : "";

  const response = await fetch(
    `${API_URL}/api/v1/listening${suffix}`,
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
