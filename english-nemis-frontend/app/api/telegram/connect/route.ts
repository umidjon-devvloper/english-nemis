import { NextResponse } from "next/server";

import {
  getSessionToken,
  SESSION_COOKIE,
} from "../../../lib/auth/session";

const API_URL = process.env.API_INTERNAL_URL;

export async function POST() {
  try {
    if (!API_URL) {
      return NextResponse.json(
        {
          success: false,
          message: "API_INTERNAL_URL is not configured",
        },
        { status: 503 },
      );
    }

    const token = await getSessionToken();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "SESSION_COOKIE_MISSING",
        },
        { status: 401 },
      );
    }

    const response = await fetch(
      `${API_URL}/api/telegram/connect`,
      {
        method: "POST",
        headers: {
          Cookie: `${SESSION_COOKIE}=${token}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );

    const contentType =
      response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        {
          success: false,
          message: "Backend returned non-JSON response",
        },
        { status: 502 },
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Telegram connect error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Telegram connection failed",
      },
      { status: 500 },
    );
  }
}