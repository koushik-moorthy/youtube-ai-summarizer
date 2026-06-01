import { AppError } from "@/lib/errors";
import {
  extractYouTubeVideoId,
  getVideoMetadata,
  getYouTubeTranscript,
} from "@/lib/youtube";
import { summarizeTranscript } from "@/services/gemini";
import { transcribeYouTubeAudio } from "@/services/transcription";
import { getYtDlpTranscript } from "@/services/youtube-captions";
import type { SummarizeResponse } from "@/types";

export async function summarizeYouTubeVideo(youtubeUrl: string): Promise<SummarizeResponse> {
  const videoId = extractYouTubeVideoId(youtubeUrl);
  const [video, captionsTranscript] = await Promise.all([
    getVideoMetadata(videoId),
    getYouTubeTranscript(videoId),
  ]);

  const captions = captionsTranscript?.trim() || (await getYtDlpTranscript(youtubeUrl));
  const transcript: string = isTranscriptUsable(captions, video.duration)
    ? captions!
    : await transcribeYouTubeAudio(youtubeUrl);

  if (!transcript.trim()) {
    throw new AppError("Transcript unavailable for this video.", 422, "TRANSCRIPT_UNAVAILABLE");
  }

  const summary = await summarizeTranscript(transcript);

  return {
    video,
    transcript,
    english: summary.english,
    tamil: summary.tamil,
  };
}

function isTranscriptUsable(transcript: string | null | undefined, duration: string) {
  if (!transcript?.trim()) return false;

  const seconds = durationToSeconds(duration);
  if (seconds === 0) return transcript.length > 500;

  const words = transcript.trim().split(/\s+/).length;
  const wordsPerMinute = words / (seconds / 60);

  return wordsPerMinute >= 45;
}

function durationToSeconds(duration: string) {
  const parts = duration.split(":").map(Number);

  if (parts.some((part) => !Number.isFinite(part))) return 0;

  return parts.reduce((total, part) => total * 60 + part, 0);
}
