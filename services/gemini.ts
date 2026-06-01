import { GoogleGenAI } from "@google/genai";
import { AppError } from "@/lib/errors";
import type { GeminiSummaryPayload, LanguageSummary } from "@/types";

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new AppError(
      "GEMINI_API_KEY or GOOGLE_API_KEY is not configured.",
      500,
      "GEMINI_NOT_CONFIGURED",
    );
  }

  geminiClient ??= new GoogleGenAI({
    apiKey,
  });

  return geminiClient;
}

export async function summarizeTranscript(transcript: string): Promise<GeminiSummaryPayload> {
  try {
    const response = await getGeminiClient().models.generateContent({
      model: getGeminiModel(),
      contents: buildPrompt(transcript),
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) {
      throw new AppError("Gemini returned an empty summary.", 502, "GEMINI_ERROR");
    }

    return parseGeminiJson(text);
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw new AppError(
      getGeminiErrorMessage(error),
      502,
      "GEMINI_ERROR",
    );
  }
}

function getGeminiModel() {
  return process.env.GEMINI_MODEL || "gemini-2.5-pro";
}

function buildPrompt(transcript: string) {
  return `You are an expert multilingual video analyst.

Analyze this transcript.

Requirements:

- Understand English.
- Understand Tamil.
- Understand mixed Tamil-English speech.
- Remove filler content.
- Extract core ideas.
- Generate concise summaries.
- Do not hallucinate.
- Preserve meaning.
- "detailedSummary" must be an array of concise bullet points, NOT a paragraph. Each entry is one self-contained point.
- "actionItems" must list concrete, actionable steps the viewer should take, written as imperative instructions (e.g. "Install X", "Run command Y"). Only populate this for action-oriented or how-to/tutorial videos. For non-actionable videos (news, commentary, entertainment, explainers with nothing to do), return an empty array [].
- Return JSON only.
- The JSON must exactly follow this TypeScript shape:
{
  "english": {
    "oneLineSummary": "string",
    "shortSummary": "string",
    "detailedSummary": ["string"],
    "keyPoints": ["string"],
    "actionItems": ["string"],
    "importantTimestamps": [{ "time": "MM:SS or HH:MM:SS", "label": "string" }]
  },
  "tamil": {
    "oneLineSummary": "string",
    "shortSummary": "string",
    "detailedSummary": ["string"],
    "keyPoints": ["string"],
    "actionItems": ["string"],
    "importantTimestamps": [{ "time": "MM:SS or HH:MM:SS", "label": "string" }]
  }
}

Transcript:

${transcript}`;
}

function parseGeminiJson(text: string): GeminiSummaryPayload {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as GeminiSummaryPayload;

    if (!parsed.english || !parsed.tamil) {
      throw new Error("Missing language summary blocks.");
    }

    return {
      english: normalizeLanguageSummary(parsed.english),
      tamil: normalizeLanguageSummary(parsed.tamil),
    };
  } catch {
    throw new AppError("Gemini returned invalid JSON.", 502, "GEMINI_ERROR");
  }
}

function normalizeLanguageSummary(summary: LanguageSummary): LanguageSummary {
  return {
    ...summary,
    detailedSummary: toStringArray(summary.detailedSummary),
    keyPoints: toStringArray(summary.keyPoints),
    actionItems: toStringArray(summary.actionItems),
    importantTimestamps: Array.isArray(summary.importantTimestamps)
      ? summary.importantTimestamps
      : [],
  };
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
  }

  if (typeof value === "string" && value.trim() !== "") {
    return value
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean);
  }

  return [];
}

function getGeminiErrorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Could not summarize transcript.";

  try {
    const parsed = JSON.parse(message) as {
      error?: { code?: number; message?: string; status?: string };
    };

    if (parsed.error?.code === 429) {
      return `Gemini quota exceeded for ${getGeminiModel()}. Check billing/quota or set GEMINI_MODEL to a model available for this key.`;
    }

    if (parsed.error?.message) return parsed.error.message;
  } catch {
    // Fall through to the original message.
  }

  return message;
}
