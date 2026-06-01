# Security Policy

## Supported versions

This project is an actively developed MVP. Security fixes are applied to the
latest `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| `main`  | :white_check_mark: |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, report them privately using
[GitHub's private vulnerability reporting](https://github.com/koushik-moorthy/youtube-ai-summarizer/security/advisories/new),
or email **koushikdugk007@gmail.com** with the details.

Please include:

- A description of the vulnerability and its impact
- Steps to reproduce (a proof of concept if possible)
- Any suggested remediation

You can expect an acknowledgement within **5 business days**. We will keep you
informed as we work on a fix and will credit you in the release notes unless
you prefer to remain anonymous.

## Handling secrets

This application requires third-party API keys (`OPENAI_API_KEY`,
`GEMINI_API_KEY` / `GOOGLE_API_KEY`).

- API keys are read from environment variables only and are **never** committed
  to the repository. `.env*.local` is git-ignored.
- All third-party API calls happen **server-side** (Next.js route handlers and
  services). Keys are never exposed to the browser.
- If you accidentally commit a key, **revoke and rotate it immediately** with
  the provider, then rewrite history to remove it.
