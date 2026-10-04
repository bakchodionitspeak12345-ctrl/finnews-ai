# FinNews AI – Financial News Simplifier

A mobile-friendly financial news reader for college students and beginner investors. Browse and search stories across five categories, then get a plain-language summary, key points, financial terms and definitions, and why the story matters.

## Demo and live providers

The app works in demo mode without API keys, using clearly labeled sample stories and explanations.

To enable live providers in Replit, add these in **Tools → Secrets**:

- `NEWSAPI_KEY` — fetch live financial and business headlines from NewsAPI.
- `GROQ_API_KEY` — generate article explanations with Groq Llama 3.3 70B.

These are server-side secrets. Do not expose them through `VITE_` variables or commit them in an `.env` file.

## Project checks

This is a pnpm workspace. Run `pnpm install` to install dependencies and `pnpm run typecheck` to typecheck the project.

The web app is in `artifacts/finnews-ai`; the Express API and provider integrations are in `artifacts/api-server`.