import { NextResponse } from "next/server";

import {
  getSessionToken,
  SESSION_COOKIE,
} from "../../../lib/auth/session";

export async function GET() {
  const token = await getSessionToken();

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      { status: 401 },
    );
  }

  const API_URL = process.env.API_INTERNAL_URL;

  if (!API_URL) {
    return NextResponse.json(
      {
        success: false,
        message: "API_INTERNAL_URL is missing",
      },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(
      `${API_URL}/api/v1/tasks/today`,
      {
        method: "GET",

        headers: {
          Cookie: `${SESSION_COOKIE}=${token}`,
        },

        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Tasks API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch daily tasks",
      },
      { status: 503 },
    );
  }
}