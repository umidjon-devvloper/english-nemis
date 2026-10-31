import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "../../../lib/auth/session";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json(
      {
        success: false,
        message: "Forbidden",
      },
      { status: 403 },
    );
  }

  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });

  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}