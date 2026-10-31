import { NextResponse } from "next/server";

import {
  getSessionToken,
  SESSION_COOKIE,
} from "../../../lib/auth/session";

const API_URL = process.env.API_INTERNAL_URL;

export async function GET() {
  try {
    if (!API_URL) {
      return NextResponse.json(
        { success: false, message: "API not configured" },
        { status: 503 },
      );
    }

    const token = await getSessionToken();

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const response = await fetch(`${API_URL}/api/telegram/status`, {
      headers: {
        Cookie: `${SESSION_COOKIE}=${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to load Telegram status" },
      { status: 500 },
    );
  }
}