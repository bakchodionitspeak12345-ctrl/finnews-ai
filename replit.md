# FinNews AI – Financial News Simplifier

A beginner-friendly financial news reader with searchable categories and plain-language explanations for college students and new investors.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/finnews-ai run dev` — run the FinNews AI web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Optional secrets: `NEWSAPI_KEY` for live headlines and `GROQ_API_KEY` for Groq explanations. The app works in demo mode without either key.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/finnews-ai` — React + Vite app
- `artifacts/api-server/src/routes/news.ts` — news and simplification API endpoints
- `artifacts/api-server/src/lib/financial-news.ts` — NewsAPI/Groq calls and demo-mode responses
- `lib/api-spec/openapi.yaml` — API contract source of truth

## Architecture decisions

- API keys are read only by the Express server; never use `VITE_`-prefixed secrets.
- No database is needed for this read-only news and explanation experience.
- Provider keys are optional; demo stories and explainers keep the app demonstrable without external credentials.

## Product

- Browse and search financial and business stories across five categories.
- Simplify any story into a summary, key points, financial terms, definitions, and why it matters.
- Clearly distinguish demo content from live NewsAPI content.

## User preferences

- Keep the experience mobile-responsive with a modern blue/dark fintech design.

## Gotchas

- Regenerate the API client and Zod schemas after changing `lib/api-spec/openapi.yaml`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
