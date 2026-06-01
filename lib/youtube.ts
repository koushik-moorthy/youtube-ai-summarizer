import { AppError } from "@/lib/errors";
import type { VideoMetadata } from "@/types";

type PlayerResponse = {
  playabilityStatus?: {
    status?: string;
    reason?: string;
  };
  videoDetails?: {
    videoId?: string;
    title?: string;
    lengthSeconds?: string;
    thumbnail?: {
      thumbnails?: Array<{ url: string; width?: number; height?: number }>;
    };
  };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: Array<{
        baseUrl: string;
        name?: { simpleText?: string; runs?: Array<{ text: string }> };
        languageCode?: string;
        kind?: string;
      }>;
    };
  };
};

type TranscriptSegment = {
  tStartMs?: number;
  segs?: Array<{ utf8?: string }>;
};

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

export function extractYouTubeVideoId(input: string) {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    throw new AppError("Enter a valid YouTube URL.", 400, "INVALID_URL");
  }

  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    throw new AppError("Only YouTube URLs are supported.", 400, "INVALID_URL");
  }

  if (url.hostname === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (isValidVideoId(id)) return id;
  }

  const watchId = url.searchParams.get("v");
  if (isValidVideoId(watchId)) return watchId;

  const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch?.[1]) return shortsMatch[1];

  const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch?.[1]) return embedMatch[1];

  throw new AppError("Could not find a YouTube video ID in that URL.", 400, "INVALID_URL");
}

export async function getVideoMetadata(videoId: string): Promise<VideoMetadata> {
  const playerResponse = await getPlayerResponse(videoId);
  const details = playerResponse.videoDetails;

  if (!details?.title) {
    throw new AppError("Video metadata is unavailable.", 404, "VIDEO_UNAVAILABLE");
  }

  const thumbnails = details.thumbnail?.thumbnails ?? [];
  const thumbnail =
    thumbnails.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ??
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return {
    id: details.videoId ?? videoId,
    title: details.title,
    thumbnail,
    duration: formatDuration(Number(details.lengthSeconds ?? 0)),
  };
}

export async function getYouTubeTranscript(videoId: string) {
  const playerResponse = await getPlayerResponse(videoId);
  const tracks =
    playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

  if (tracks.length === 0) return null;

  const preferredTrack =
    tracks.find((track) => track.languageCode?.startsWith("en") && track.kind !== "asr") ??
    tracks.find((track) => track.languageCode?.startsWith("ta")) ??
    tracks.find((track) => track.kind !== "asr") ??
    tracks[0];

  const transcriptUrl = new URL(preferredTrack.baseUrl);
  transcriptUrl.searchParams.set("fmt", "json3");

  const response = await fetch(transcriptUrl.toString(), {
    headers: getYouTubeHeaders(videoId),
    cache: "no-store",
  });

  if (!response.ok) return null;

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await response.json()) as { events?: TranscriptSegment[] };
    return transcriptFromJson(body.events ?? []);
  }

  return transcriptFromXml(await response.text());
}

async function getPlayerResponse(videoId: string): Promise<PlayerResponse> {
  const response = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
    headers: getYouTubeHeaders(videoId),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new AppError("Video unavailable or unreachable.", 404, "VIDEO_UNAVAILABLE");
  }

  const html = await response.text();
  const responseJson = extractPlayerResponseJson(html);

  if (!responseJson) {
    throw new AppError("Could not read YouTube video details.", 404, "VIDEO_UNAVAILABLE");
  }

  const playerResponse = JSON.parse(responseJson) as PlayerResponse;
  const status = playerResponse.playabilityStatus?.status;

  if (status && status !== "OK") {
    throw new AppError(
      playerResponse.playabilityStatus?.reason ?? "Video unavailable.",
      404,
      "VIDEO_UNAVAILABLE",
    );
  }

  return playerResponse;
}

function extractPlayerResponseJson(html: string) {
  const marker = "var ytInitialPlayerResponse = ";
  const start = html.indexOf(marker);

  if (start === -1) return null;

  const jsonStart = start + marker.length;
  const end = findJsonObjectEnd(html, jsonStart);

  if (end === -1) return null;

  return html.slice(jsonStart, end + 1);
}

function findJsonObjectEnd(input: string, start: number) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < input.length; index += 1) {
    const char = input[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;

    if (depth === 0) return index;
  }

  return -1;
}

function transcriptFromJson(events: TranscriptSegment[]) {
  return events
    .map((event) => {
      const text = event.segs
        ?.map((segment) => segment.utf8 ?? "")
        .join("")
        .replace(/\s+/g, " ")
        .trim();

      if (!text) return null;

      return `[${formatDuration(Math.floor((event.tStartMs ?? 0) / 1000))}] ${text}`;
    })
    .filter(Boolean)
    .join("\n");
}

function transcriptFromXml(xml: string) {
  const lines = Array.from(xml.matchAll(/<text start="([^"]+)"[^>]*>(.*?)<\/text>/g)).map(
    ([, start, text]) => {
      const decoded = decodeHtml(text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
      return `[${formatDuration(Math.floor(Number(start)))}] ${decoded.trim()}`;
    },
  );

  return lines.filter(Boolean).join("\n");
}

export function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "00:00";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts = hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];
  return parts.map((part) => String(part).padStart(2, "0")).join(":");
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

function isValidVideoId(id: string | null | undefined): id is string {
  return Boolean(id && /^[a-zA-Z0-9_-]{11}$/.test(id));
}

function getYouTubeHeaders(videoId: string) {
  return {
    "accept-language": "en-US,en;q=0.9",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    referer: `https://www.youtube.com/watch?v=${videoId}`,
  };
}
