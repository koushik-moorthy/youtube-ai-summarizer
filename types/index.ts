export type VideoMetadata = {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
};

export type TimestampItem = {
  time: string;
  label: string;
};

export type LanguageSummary = {
  oneLineSummary: string;
  shortSummary: string;
  detailedSummary: string[];
  keyPoints: string[];
  actionItems: string[];
  importantTimestamps: TimestampItem[];
};

export type SummarizeRequest = {
  youtubeUrl: string;
};

export type SummarizeResponse = {
  video: VideoMetadata;
  transcript: string;
  english: LanguageSummary;
  tamil: LanguageSummary;
};

export type GeminiSummaryPayload = {
  english: LanguageSummary;
  tamil: LanguageSummary;
};
