import { NextRequest } from "next/server";

import {
  getSessionToken,
  SESSION_COOKIE,
} from "../../../../lib/auth/session";

const API_URL =
  process.env.API_INTERNAL_URL ?? "http://localhost:4000";

export async function POST(request: NextRequest) {
  const token = await getSessionToken();

  if (!token) {
    return new Response(
      JSON.stringify({ success: false, message: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const body = await request.text();

  const upstream = await fetch(
    `${API_URL}/api/v1/practice/chat/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
      },
      body,
      // Do NOT set a timeout — streaming can be long.
    },
  );

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") || "application/json",
      },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
