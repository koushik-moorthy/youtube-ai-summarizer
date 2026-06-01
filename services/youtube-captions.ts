import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import youtubeDl from "youtube-dl-exec";

const CAPTION_LANGUAGE_ATTEMPTS = ["en", "en.*", "ta", "ta.*"];

export async function getYtDlpTranscript(youtubeUrl: string) {
  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), `youtube-captions-${randomUUID()}-`),
  );

  try {
    for (const language of CAPTION_LANGUAGE_ATTEMPTS) {
      await clearTempDir(tempDir);

      try {
        await youtubeDl(youtubeUrl, {
          skipDownload: true,
          writeSub: true,
          writeAutoSub: true,
          subLang: language,
          subFormat: "vtt",
          output: path.join(tempDir, "captions.%(ext)s"),
          noPlaylist: true,
          noWarnings: true,
        });

        const transcript = await readFirstTranscript(tempDir);
        if (transcript) return transcript;
      } catch (error) {
        console.warn(`Caption download failed for language "${language}": ${formatToolError(error)}`);
        // Try the next caption language before falling back to audio transcription.
      }
    }

    return null;
  } catch {
    return null;
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

async function readFirstTranscript(tempDir: string) {
  const files = await fs.promises.readdir(tempDir);
  const captionFile = files.find((file) => file.endsWith(".vtt"));

  if (!captionFile) return null;

  const vtt = await fs.promises.readFile(path.join(tempDir, captionFile), "utf8");
  return transcriptFromVtt(vtt) || null;
}

async function clearTempDir(tempDir: string) {
  const files = await fs.promises.readdir(tempDir);

  await Promise.all(
    files.map((file) => fs.promises.rm(path.join(tempDir, file), { force: true })),
  );
}

function transcriptFromVtt(vtt: string) {
  const cues = vtt
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter((block) => block.includes("-->"));

  const transcript: string[] = [];
  let previousCueText = "";

  for (const cue of cues) {
    const [timingLine, ...textLines] = cue.split(/\r?\n/);
    const startTime = timingLine.split("-->")[0]?.trim();
    const cueText = normalizeCaptionText(textLines.join(" "));

    if (!startTime || !cueText || cueText === previousCueText) continue;

    const addition =
      previousCueText && cueText.startsWith(`${previousCueText} `)
        ? cueText.slice(previousCueText.length).trim()
        : cueText;

    if (addition) {
      transcript.push(`[${normalizeTimestamp(startTime)}] ${addition}`);
    }

    previousCueText = cueText;
  }

  return transcript.join("\n");
}

function normalizeCaptionText(text: string) {
  return decodeHtml(
    text
      .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, "")
      .replace(/<\/?c>/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function normalizeTimestamp(timestamp: string) {
  return timestamp.replace(/\.\d+$/, "");
}

function decodeHtml(input: string) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function formatToolError(error: unknown) {
  if (error && typeof error === "object") {
    const toolError = error as { message?: string; stderr?: string; stdout?: string };
    return toolError.stderr || toolError.message || toolError.stdout || String(error);
  }

  return String(error);
}
