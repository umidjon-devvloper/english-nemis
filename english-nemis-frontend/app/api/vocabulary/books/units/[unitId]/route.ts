import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.API_INTERNAL_URL || "http://localhost:4000";

type RouteContext = {
  params: Promise<{
    unitId: string;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { unitId } = await params;

    console.log("📖 GET Vocabulary Unit:", unitId);

    if (!/^[a-fA-F0-9]{24}$/.test(unitId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid unit ID",
        },
        { status: 400 }
      );
    }

    const backendUrl = `${API_URL}/api/v1/vocabulary/units/${unitId}`;

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    const text = await response.text();

    if (!text.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Backend bo‘sh javob qaytardi",
          backendStatus: response.status,
        },
        { status: 502 }
      );
    }

    let data: unknown;

    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Backend JSON qaytarmadi",
          backendStatus: response.status,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("❌ Vocabulary unit error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unit ma'lumotlarini yuklashda xatolik",
      },
      { status: 500 }
    );
  }
}