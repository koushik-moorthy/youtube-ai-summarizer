# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Bullet-point detailed summaries: `detailedSummary` is now an array of concise
  points instead of a single paragraph.
- Action items: action-oriented (how-to/tutorial) videos now produce an
  `actionItems` list of concrete, imperative steps. Non-actionable videos return
  an empty list.
- Open-source project files: `LICENSE` (MIT), `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `SECURITY.md`,
  GitHub issue/PR templates, and a CI workflow (lint, typecheck, build).

### Changed

- Hardened Gemini JSON parsing to normalize summary fields, coercing stray
  string values into arrays so malformed model output no longer breaks the UI.

## [0.1.0] - 2026-06-01

### Added

- Initial release: paste a YouTube URL to extract metadata, fetch captions (with
  an audio-transcription fallback via `gpt-4o-mini-transcribe`), and generate
  English and Tamil summaries with key points and timestamps using
  `gemini-2.5-pro`.
- `POST /api/summarize` endpoint.

[Unreleased]: https://github.com/koushik/youtube-ai-summarizer/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/koushik/youtube-ai-summarizer/releases/tag/v0.1.0
