# Contributing to YouTube AI Summarizer

Thanks for your interest in contributing! This guide covers how to get set up,
the conventions we follow, and how to submit changes. By participating you agree
to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- 🐛 Report bugs via [issues](https://github.com/koushik-moorthy/youtube-ai-summarizer/issues)
- 💡 Suggest features or improvements
- 📖 Improve documentation
- 🔧 Submit bug fixes and features via pull requests

## Development setup

**Prerequisites:** Node.js `>= 18.18` and npm.

```bash
# 1. Fork and clone
git clone https://github.com/<your-username>/youtube-ai-summarizer.git
cd youtube-ai-summarizer

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# then add your OPENAI_API_KEY and GEMINI_API_KEY

# 4. Run the dev server
npm run dev
```

The app runs at `http://localhost:3000`.

## Project structure

```
app/                 Next.js App Router (pages + API routes)
  api/summarize/     POST endpoint that orchestrates the pipeline
components/          React components and local UI primitives
lib/                 Pure helpers (YouTube parsing, error types, utils)
services/            External integrations and orchestration
  summarize.ts       Top-level pipeline (captions → transcription → summary)
  youtube-captions.ts Caption fetching
  transcription.ts   OpenAI audio transcription fallback
  gemini.ts          Gemini summarization + prompt
types/               Shared TypeScript types
```

## Before you open a PR

Run the full check suite locally — these are the same checks CI runs:

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run build       # next build
```

Then verify your change by actually running the app (`npm run dev`) and
exercising the affected flow.

## Pull request guidelines

- **Branch** off `main` with a descriptive name (`fix/caption-fallback`,
  `feat/export-markdown`).
- **Keep PRs focused** — one logical change per PR is easier to review.
- **Write a clear description** of what changed and why; link any related issue.
- **Update docs** (README, this file) when behavior or setup changes.
- Make sure lint, typecheck, and build all pass.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add markdown export for summaries
fix: handle videos without captions
docs: clarify GEMINI_MODEL configuration
chore: bump dependencies
```

## Coding conventions

- TypeScript, strict mode. Prefer explicit types at module boundaries.
- Match the style of the surrounding code; an `.editorconfig` is provided.
- Keep external integrations inside `services/` and pure logic inside `lib/`.
- Never log or commit API keys.

## Reporting security issues

Please **do not** open public issues for security vulnerabilities. See
[SECURITY.md](SECURITY.md) for private reporting instructions.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).
