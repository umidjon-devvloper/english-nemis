import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ unitId: string }> }
) {
  try {
    const { unitId } = await context.params;

    const API_URL =
      process.env.API_INTERNAL_URL || "http://localhost:4000";

    const response = await fetch(
      `${API_URL}/api/v1/vocabulary/units/${unitId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Cookie: request.headers.get("cookie") || "",
        },
        cache: "no-store",
      }
    );

    const text = await response.text();

    if (!text.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Backend bo'sh javob qaytardi",
        },
        { status: 502 }
      );
    }

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Backend JSON qaytarmadi",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Unit API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error",
      },
      { status: 500 }
    );
  }
}
