import { NextRequest, NextResponse } from "next/server";

import {
  getSessionToken,
  SESSION_COOKIE,
} from "../../../../lib/auth/session";

const API_URL =
  process.env.API_INTERNAL_URL ?? "http://localhost:4000";

async function proxy(
  method: "GET" | "DELETE",
  id: string,
) {
  const token = await getSessionToken();

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid id" },
      { status: 400 },
    );
  }

  const response = await fetch(
    `${API_URL}/api/v1/practice/conversations/${id}`,
    {
      method,
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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxy("GET", id);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxy("DELETE", id);
}
