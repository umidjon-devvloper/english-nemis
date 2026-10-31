import { NextRequest, NextResponse } from "next/server";

import {
  getSessionToken,
  SESSION_COOKIE,
} from "../../../../lib/auth/session";

const API_URL =
  process.env.API_INTERNAL_URL ?? "http://localhost:4000";

export async function POST(request: NextRequest) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const response = await fetch(
    `${API_URL}/api/v1/vocabulary/daily/answer`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  const data = await response.json().catch(() => null);
  return NextResponse.json(data ?? { success: false }, {
    status: response.status,
  });
}
