import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { summarizeYouTubeVideo } from "@/services/summarize";
import type { SummarizeRequest } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<SummarizeRequest>;

    if (!body.youtubeUrl || typeof body.youtubeUrl !== "string") {
      return NextResponse.json(
        { error: { message: "youtubeUrl is required.", code: "INVALID_URL" } },
        { status: 400 },
      );
    }

    const result = await summarizeYouTubeVideo(body.youtubeUrl);
    return NextResponse.json(result);
  } catch (error) {
    const normalized = getErrorMessage(error);

    return NextResponse.json(
      {
        error: {
          message: normalized.message,
          code: normalized.code,
        },
      },
      { status: normalized.status },
    );
  }
}
