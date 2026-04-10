import { NextRequest, NextResponse } from "next/server";
import { hasLLMKey, callLLMStream } from "@/lib/llm";
import { listWikiPages } from "@/lib/wiki";
import {
  selectPagesForQuery,
  buildContext,
  buildQuerySystemPrompt,
} from "@/lib/query";

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

    const trimmedQuestion = question.trim();
    const entries = await listWikiPages();

    // Empty wiki — nothing to query
    if (entries.length === 0) {
      return NextResponse.json(
        {
          error:
            "The wiki is empty. Please ingest some content first so I have something to answer from.",
        },
        { status: 400 },
      );
    }

    if (!hasLLMKey()) {
      return NextResponse.json(
        {
          error:
            "No API key configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or another provider key.",
        },
        { status: 500 },
      );
    }

    // Select relevant pages and build context (same logic as query())
    const selectedSlugs = await selectPagesForQuery(trimmedQuestion, entries);
    const { context, slugs: loadedSlugs } =
      await buildContext(selectedSlugs);

    // Build the system prompt (same as non-streaming query)
    const systemPrompt = await buildQuerySystemPrompt(
      context,
      entries,
      selectedSlugs,
    );

    // Stream the LLM response
    const result = callLLMStream(systemPrompt, trimmedQuestion);

    return result.toTextStreamResponse({
      headers: {
        "X-Wiki-Sources": JSON.stringify(loadedSlugs),
      },
    });
  } catch (error) {
    console.error("Query stream error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
