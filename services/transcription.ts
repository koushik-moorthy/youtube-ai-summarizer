import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import ytdl from "@distube/ytdl-core";
import OpenAI from "openai";
import youtubeDl from "youtube-dl-exec";
import { AppError } from "@/lib/errors";

let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new AppError("OPENAI_API_KEY is not configured.", 500, "OPENAI_NOT_CONFIGURED");
  }

  openaiClient ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return openaiClient;
}

export async function transcribeYouTubeAudio(youtubeUrl: string) {
  const tempPath = path.join(os.tmpdir(), `youtube-audio-${randomUUID()}.mp3`);

  try {
    await downloadAudio(youtubeUrl, tempPath);

    const transcription = await getOpenAIClient().audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: "gpt-4o-mini-transcribe",
      response_format: "text",
    });

    if (!transcription || typeof transcription !== "string") {
      throw new AppError("OpenAI returned an empty transcript.", 502, "OPENAI_ERROR");
    }

    return transcription.trim();
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw new AppError(
      error instanceof Error ? error.message : "Could not transcribe audio.",
      502,
      "OPENAI_ERROR",
    );
  } finally {
    await fs.promises.rm(tempPath, { force: true });
  }
}

async function downloadAudio(youtubeUrl: string, outputPath: string) {
  try {
    await downloadAudioWithYtDlp(youtubeUrl, outputPath);
    return;
  } catch (error) {
    console.warn(`yt-dlp audio download failed: ${formatToolError(error)}`);
    // Fall back to the pure Node downloader below for environments where yt-dlp fails.
  }

  try {
    const audioStream = ytdl(youtubeUrl, {
      quality: "highestaudio",
      filter: "audioonly",
      highWaterMark: 1 << 25,
    });

    await pipeline(audioStream, fs.createWriteStream(outputPath));
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Could not download YouTube audio.",
      502,
      "TRANSCRIPT_UNAVAILABLE",
    );
  }
}

async function downloadAudioWithYtDlp(youtubeUrl: string, outputPath: string) {
  await youtubeDl(youtubeUrl, {
    extractAudio: true,
    audioFormat: "mp3",
    audioQuality: 5,
    output: outputPath,
    noPlaylist: true,
    noWarnings: true,
  });
}

function formatToolError(error: unknown) {
  if (error && typeof error === "object") {
    const toolError = error as { message?: string; stderr?: string; stdout?: string };
    return toolError.stderr || toolError.message || toolError.stdout || String(error);
  }

  return String(error);
}
