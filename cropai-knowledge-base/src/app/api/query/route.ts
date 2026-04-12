import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/query";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { question } = body;

    if (
      !question ||
      typeof question !== "string" ||
      question.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "question is required and must be a non-empty string" },
        { status: 400 },
      );
    }

    const result = await query(question.trim());

    return NextResponse.json(result);
  } catch (error) {
    console.error("Query error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
