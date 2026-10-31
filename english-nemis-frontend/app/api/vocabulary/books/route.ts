import { NextRequest, NextResponse } from "next/server";

import {
  getSessionToken,
  SESSION_COOKIE,
} from "../../../lib/auth/session";

const API_URL =
  process.env.API_INTERNAL_URL ?? "http://localhost:4000";

export async function GET(request: NextRequest) {
  try {
    const token = await getSessionToken();

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const language =
      request.nextUrl.searchParams.get("language") ?? "english";

    if (!["english", "german"].includes(language)) {
      return NextResponse.json(
        { success: false, message: "Invalid language" },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${API_URL}/api/v1/vocabulary/books?language=${language}`,
      {
        headers: {
          Cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
        },
        cache: "no-store",
      },
    );

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Vocabulary books error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to load books" },
      { status: 500 },
    );
  }
}