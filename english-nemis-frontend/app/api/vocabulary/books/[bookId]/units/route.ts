import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.API_INTERNAL_URL ??
  "http://localhost:4000";

type Context = {
  params: Promise<{
    bookId: string;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: Context
) {
  try {
    const { bookId } = await params;

    if (!/^[a-f\d]{24}$/i.test(bookId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid book ID",
        },
        { status: 400 }
      );
    }

    const backendUrl =
      `${API_URL}/api/v1/vocabulary/books/${bookId}/units`;

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    const contentType =
      response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      const body = await response.text();

      console.error("Backend returned non-JSON:", {
        backendUrl,
        status: response.status,
        body: body.slice(0, 500),
      });

      return NextResponse.json(
        {
          success: false,
          message: "Backend JSON qaytarmadi",
          backendStatus: response.status,
        },
        { status: 502 }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Vocabulary units API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unitlarni yuklashda xatolik",
      },
      { status: 500 }
    );
  }
}