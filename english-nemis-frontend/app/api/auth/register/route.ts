import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.email(),
  password: z.string().min(8).max(128),
});

const API_URL = process.env.API_INTERNAL_URL;

export async function POST(request: NextRequest) {
  if (!API_URL) {
    return NextResponse.json(
      { success: false, message: "Service not configured" },
      { status: 503 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Ism (2–80), to‘g‘ri email va kamida 8 belgi parol kiriting.",
      },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `${API_URL}/api/v1/auth/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );

    const data = await response.json().catch(() => null);

    return NextResponse.json(data ?? { success: false }, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Service unavailable" },
      { status: 503 },
    );
  }
}
