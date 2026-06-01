"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { AlertCircle, Loader2, Play, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { LanguageSummary, SummarizeResponse } from "@/types";

type ApiError = {
  error?: {
    message?: string;
    code?: string;
  };
};

export function Summarizer() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [result, setResult] = useState<SummarizeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ youtubeUrl }),
      });

      const payload = (await response.json()) as SummarizeResponse & ApiError;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Could not summarize this video.");
      }

      setResult(payload);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <section className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-accent">
              <Sparkles className="h-4 w-4" />
              YouTube AI Summarizer
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              Summarize YouTube videos in English and Tamil.
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              aria-label="YouTube URL"
              disabled={isLoading}
              className="h-12"
            />
            <Button type="submit" disabled={isLoading || !youtubeUrl.trim()} className="h-12">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Summarize
            </Button>
          </form>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
            <p>{error}</p>
          </div>
        ) : null}

        {isLoading ? <LoadingState /> : null}

        {result ? (
          <>
            <VideoCard result={result} />
            <div className="grid gap-5 lg:grid-cols-2">
              <SummaryCard title="English Summary" summary={result.english} />
              <SummaryCard title="Tamil Summary" summary={result.tamil} />
            </div>
            <KeyPoints result={result} />
            <TranscriptViewer transcript={result.transcript} />
          </>
        ) : null}

        {!isLoading && !result ? (
          <Card className="border-dashed">
            <CardContent className="flex min-h-48 items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Paste a YouTube URL to extract metadata, fetch captions or transcribe audio, and generate multilingual summaries.
            </CardContent>
          </Card>
        ) : null}
      </section>
    </main>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-5">
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-[220px_1fr]">
          <Skeleton className="aspect-video w-full" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-48" />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

function VideoCard({ result }: { result: SummarizeResponse }) {
  return (
    <Card>
      <CardContent className="grid gap-4 p-5 sm:grid-cols-[240px_1fr]">
        <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
          <Image
            src={result.video.thumbnail}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 240px"
          />
        </div>
        <div className="flex flex-col justify-center gap-3">
          <Badge className="w-fit">{result.video.duration}</Badge>
          <h2 className="text-xl font-semibold leading-snug">{result.video.title}</h2>
          <p className="text-sm text-muted-foreground">{result.english.oneLineSummary}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ title, summary }: { title: string; summary: LanguageSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Short summary</p>
          <p className="mt-2 leading-7">{summary.shortSummary}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Detailed summary</p>
          <ul className="mt-2 space-y-2 leading-7">
            {summary.detailedSummary.map((point) => (
              <li key={point} className="flex gap-2">
                <span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-accent" aria-hidden />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        {summary.actionItems.length > 0 ? (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Action items</p>
            <ul className="mt-3 space-y-2 text-sm leading-6">
              {summary.actionItems.map((item, index) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-md border border-accent/30 bg-accent/5 px-3 py-2"
                >
                  <span className="flex-none font-semibold text-accent">{index + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {summary.importantTimestamps.length > 0 ? (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Important timestamps</p>
            <div className="mt-3 grid gap-2">
              {summary.importantTimestamps.map((item) => (
                <div key={`${item.time}-${item.label}`} className="flex gap-3 text-sm">
                  <Badge>{item.time}</Badge>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function KeyPoints({ result }: { result: SummarizeResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Key Points</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <PointList title="English" points={result.english.keyPoints} />
        <PointList title="Tamil" points={result.tamil.keyPoints} />
      </CardContent>
    </Card>
  );
}

function PointList({ title, points }: { title: string; points: string[] }) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-muted-foreground">{title}</p>
      <ul className="space-y-2 text-sm leading-6">
        {points.map((point) => (
          <li key={point} className="rounded-md bg-secondary px-3 py-2">
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TranscriptViewer({ transcript }: { transcript: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcript Viewer</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea value={transcript} readOnly className="min-h-96 font-mono text-xs leading-6" />
      </CardContent>
    </Card>
  );
}
