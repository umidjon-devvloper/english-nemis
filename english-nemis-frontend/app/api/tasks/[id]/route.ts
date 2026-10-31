import { NextRequest, NextResponse } from "next/server";

import {
  getSessionToken,
  SESSION_COOKIE,
} from "../../../lib/auth/session";

const API_URL = process.env.API_INTERNAL_URL;

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid task ID",
      },
      { status: 400 },
    );
  }

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

  if (!API_URL) {
    return NextResponse.json(
      {
        success: false,
        message: "Backend unavailable",
      },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(
      `${API_URL}/api/v1/tasks/${id}`,
      {
        headers: {
          Cookie: `${SESSION_COOKIE}=${token}`,
        },
        cache: "no-store",
      },
    );

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Unable to load task",
      },
      { status: 503 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid task ID" },
      { status: 400 },
    );
  }

  const token = await getSessionToken();

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  if (!API_URL) {
    return NextResponse.json(
      { success: false, message: "Backend unavailable" },
      { status: 503 },
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
    `${API_URL}/api/v1/tasks/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE}=${token}`,
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