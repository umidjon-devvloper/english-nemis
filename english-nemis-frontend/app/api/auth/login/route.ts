import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { SESSION_COOKIE } from "../../../lib/auth/session";


const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});

const API_URL = process.env.API_INTERNAL_URL;

export async function POST(request: NextRequest) {
  try {
    if (!API_URL) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication service is not configured",
        },
        { status: 503 },
      );
    }

    const body: unknown = await request.json().catch(() => null);

    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${API_URL}/api/v1/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            response.status === 401
              ? "Invalid email or password"
              : "Unable to sign in",
        },
        {
          status: response.status === 401 ? 401 : 502,
        },
      );
    }

    const backendCookie = response.headers
      .getSetCookie()
      .find((value) =>
        value.startsWith(`${SESSION_COOKIE}=`),
      );

    if (!backendCookie) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication session was not created",
        },
        { status: 502 },
      );
    }

    const token = backendCookie
      .split(";")[0]
      .slice(`${SESSION_COOKIE}=`.length);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid authentication session",
        },
        { status: 502 },
      );
    }

    const result = NextResponse.json({
      success: true,
      message: "Login successful",
    });

    result.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return result;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Authentication service unavailable",
      },
      { status: 503 },
    );
  }
}