# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this project is

**学伴 (XueBan / Learning Partner)** — an AI-driven personal learning OS. Instead of
free-form chat, it structures learning into a verifiable loop:
**讲解 → 确认 → 测验 → 复习 → 结果分析** (explain → confirm → quiz → review → result),
plus spaced-repetition review cards, a wrong-question book, a Notion-style notes
module, a knowledge base, an "Idea Validator" side product, and a Chrome extension.

Production: <https://xueban.org> (and a Vercel deployment).
The package name in `package.json` (`python-study-system`) is legacy — ignore it.

## Language conventions

- **User-facing copy, code comments, and commit messages are Chinese.** Match this
  when editing existing files; don't convert existing Chinese comments to English.
- Identifiers, types, and file names are English.
- Commit messages follow Conventional Commits with Chinese or English subjects
  (`feat: ship adaptive personal learning loop`, `fix: 修复...`).

## Commands

```bash
npm install          # runs `prisma generate` via postinstall — required before typecheck/build
npm run dev          # dev server on port 3003 (NOT 3000)
npm run build        # next build
npm run start        # next start
npm run lint         # next lint (eslint-config-next)
npm run db:check     # scripts/db-check.js — DNS + TCP reachability probe for DATABASE_URL
npx prisma generate  # regenerate client into app/generated/prisma
npx prisma migrate dev --name <name>   # create + apply a migration locally
```

There is **no test suite**. Verification = `npm run lint` + `npm run build` +
manual exercise of the affected route. Don't claim tests pass; there are none.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router, React 18, TypeScript (`strict: true`) |
| Styling | Tailwind CSS (`darkMode: 'class'`) + Ant Design v6 + custom CSS layers |
| State | Zustand (`persist` + `immer` + `devtools`) for client stores |
| ORM / DB | Prisma 6 → PostgreSQL |
| Auth | Clerk (`@clerk/nextjs`) |
| AI | DeepSeek via OpenAI-compatible API (server proxy); 讯飞星火 as an optional provider |
| Charts / UI | Recharts, framer-motion, lucide-react, react-hot-toast |
| Content | react-markdown + remark/rehype + KaTeX, pdfjs-dist, tesseract.js, mammoth, xlsx |

Path alias: `@/*` → repo root (so `@/app/lib/prisma`, not relative climbs, in `app/api/**`).

## Layout

```
app/
  api/**/route.ts       # all backend endpoints (App Router handlers)
  <route>/page.tsx      # pages: /, /today, /learning-setup, /learning-interface,
                        #        /review, /knowledge-base, /notes, /wrong-book,
                        #        /workspace, /validator, /dashboard, /learning-history, ...
  components/           # shared UI; LearningFlow/, notion/, wrong-book/, home/, markdown/
  services/             # business logic (server-side + client-side variants)
  lib/                  # prisma, memory-db, db-fallback, auth-user, apiClient, aiPrompts
  stores/               # zustand stores
  types/                # shared TS types
  generated/prisma/     # Prisma client output — gitignored, generated
prisma/schema.prisma    # data model + migrations/
chrome-extension/       # MV3 side-panel extension ("认知透镜"), talks to /api/extension/*
scripts/                # db-check.js, seed_knowledge.ts, enable-vector.js, build-learning-index.js
.trae/documents/        # historical design/fix notes (Chinese) — useful context, not specs
```

`components/learning/ConfirmStep.tsx` at the repo root is a stray duplicate of the
real component in `app/components/LearningFlow/`. Edit the `app/` one.

## The three patterns that matter most

### 1. Every DB-touching API route has a local-storage fallback

This is the single most important convention. `app/lib/memory-db.ts` implements a
file-backed mirror of the Prisma models (`.local-data/dev-db.json`, or `/tmp/.local-data`
on read-only hosts like Vercel), and `app/lib/db-fallback.ts` decides when to use it.

Canonical route shape (see `app/api/review-cards/route.ts` for the reference version):

```ts
const { userId } = await auth()
if (!userId) return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })

if (shouldUseLocalDb()) return handleWithMemoryDB(...)   // dev + DEV_DATABASE_MODE=local

try {
  const data = await prisma.model.findMany({ where: { userId } })
  clearDbUnavailable()
  return NextResponse.json({ success: true, data })
} catch (error) {
  if (noteDbUnavailable(error)) return handleWithMemoryDB(...)  // sets a 60s cooldown
  console.error('...失败:', error)
  return NextResponse.json({ success: false, error: '...失败' }, { status: 500 })
}
```

Rules:
- **Fallback is disabled in production** (`MEMORY_FALLBACK_ENABLED` requires
  `NODE_ENV !== 'production'`). Production must surface DB failures rather than
  write to ephemeral `/tmp` and report "saved". Do not weaken this.
- Responses served from local storage include `source: 'local'`.
- When you add a Prisma model that an API route reads/writes, add the matching
  methods to `MemoryDB` too, or the route breaks in local dev.
- `app/api/partner/_memory.ts` is a separate, self-contained memory store for the
  Partner module — same idea, different file.

### 2. All AI calls go through the server proxy

`app/api/openai-chat/route.ts` is the single upstream gateway. Client code never
holds an API key.

- Accepts both `{ messages }` and legacy `{ query, history }`.
- `sanitizeMessages`: last **32** messages, each truncated to **4000** chars.
- Injects `GLOBAL_SYSTEM_PROMPT` from `app/lib/aiPrompts.ts` (or prepends it to an
  existing system message). Keep prompt-persona changes in that one file.
- `purpose` (`lecture|qa|quiz|grading|chat`) picks a `max_tokens` budget; clamped to
  200–2400. `temperature` clamped 0–1.
- `?stream=1` converts upstream SSE into a plain-text incremental stream, flushing
  every ≥32 chars. Streaming timeout 35s, non-streaming 45s; abort → HTTP 504.
- Env: `OPENAI_API_KEY`, `OPENAI_BASE_URL` (DeepSeek default), `OPENAI_MODEL`.
- `app/services/ai/` provides a provider abstraction (`createProviderFromEnv`)
  selecting OpenAI-proxy or Xunfei via `NEXT_PUBLIC_AI_PROVIDER`; it falls back to
  the proxy when Xunfei credentials are missing.

### 3. Auth is Clerk middleware + per-route `auth()`

`middleware.ts` lists protected pages and protected APIs explicitly. **Adding a new
authenticated page or API means adding it to those matchers** — routes are public by
default.

Note the deliberate dev escape hatch: in `NODE_ENV === 'development'`, all
`/api/*` requests skip `auth.protect()`. Route handlers still call `auth()`
themselves, so `userId` can be null in dev — handle it.

Helpers: `getAuthenticatedUserId()` / `unauthorizedResponse()` in `app/lib/auth-user.ts`.

## Data model notes

`prisma/schema.prisma` generates to **`../app/generated/prisma`**, not `node_modules`.
Import from `app/lib/prisma.ts` (a hot-reload-safe singleton), never construct
`PrismaClient` directly.

Model groups:
- **Learning loop**: `Conversation` → `LearningSession` (1:1) → `QuizQuestion`,
  `UserAnswer`; plus `LearningStats` (incl. streak fields).
- **Retention**: `ReviewCard` (spaced repetition, stages over `[1,3,7,14,30,60]` days),
  `WrongQuestion` (错题本, same staging idea).
- **Content**: `Note` → `NoteBlock` (Notion-style blocks), `KnowledgeBaseItem`,
  `LearningItem`.
- **RAG scaffolding**: `KnowledgeChunk`, `LocalExamProfile`, `QuestionBank`,
  `QuestionQC`. **pgvector is commented out** in `KnowledgeChunk` — vector search is
  not live; `scripts/enable-vector.js` exists for enabling it.
- **Partner**: `PartnerSession` → `PartnerMessage`, `PartnerAsset`.
- **Other**: `UserProfile` (id = Clerk user id), `IdeaValidation`, `Visit`.

`vercel.json` deliberately runs plain `npm run build` — migrations are **not** applied
during web deploy (commit 28ab906). Apply migrations separately.

## Learning-flow vocabulary (known drift — read before touching it)

Two step vocabularies coexist and are only partially reconciled:

- `app/types/learning.ts` — `LearningState = 'DIAGNOSE' | 'ANALYSIS' | 'REMEDY' |
  'VERIFY' | 'DONE' | 'EXPLAIN' | 'CONFIRM' | 'QUIZ' | 'REVIEW' | 'RESULT'`.
  `app/learning-interface/page.tsx` drives the UI with `DIAGNOSE / ANALYSIS / REMEDY / DONE`.
- Persistence normalizes to four values: `LearningProgressService.normalizeStep()`
  maps everything to `EXPLAIN | COACH | QUIZ | REVIEW` (`LearningSession.currentStep`,
  default `"EXPLAIN"`).
- `app/stores/learningStore.ts` uses yet another set: `EXPLAIN | CONFIRM | QUIZ | REVIEW | RESULT`.

When adding a step, update the type union, `STEP_METADATA`, the `normalizeStep` map,
and the UI switch together — otherwise state silently degrades to `EXPLAIN` on reload.

Client vs server split: `app/services/learningProgressService.ts` imports Prisma
(server only); `app/services/learningProgressClient.ts` is the fetch-based twin for
components. Don't import the server one into a `'use client'` file.

## Styling

- **Current design language is the light-first "zen" system**: `.zen-panel`,
  `.zen-chip`, `.zen-button`, `.zen-select` in `app/globals.css` (`@layer components`),
  plus Tailwind utilities with `dark:` variants. Note `zen-button-secondary` is
  *used* (`app/page.tsx`, `app/review/page.tsx`) but never defined — those links
  currently render unstyled apart from their Tailwind padding.
- An older `.apple-*` dark system (`design-system.md`) still lives in `globals.css`
  and `tailwind.config.ts` and is used by some screens. `design-system.md` documents
  that older dark-mode system — treat it as historical for anything using `zen-*`.
- Theme: `app/providers/ThemeProvider.tsx` supports `light | dark | system`, persists
  to `localStorage['xueban-theme-mode']`, sets `documentElement.dataset.theme` and
  toggles the `dark` class, and feeds Ant Design's `ConfigProvider` (locale `zh_CN`).
  New UI must look correct in both modes.
- Product aesthetic per the README: minimal, modern, Jobs-esque.

## Markdown & math rendering

`app/components/markdown/useMarkdownRenderer.tsx` is the shared pipeline: remark-gfm,
remark-math, remark-breaks, rehype-katex, Prism syntax highlighting (one-light/one-dark
by theme), plus two local plugins (`remarkTypographyFixes`, `remarkHtmlBrToBreak`) and
a heavy `preprocessContent` normalizer. Many past bugs were table/`<br>`/spacing
regressions — reuse this renderer rather than wiring remark plugins ad hoc.

## Environment variables

Copy `.env.example` → `.env.local`. Key ones:

```bash
DEV_DATABASE_MODE=local        # local (default) = use .local-data JSON; remote = hit Postgres
ENABLE_MEMORY_DB_FALLBACK=true # no effect in production
DATABASE_URL=postgresql://...  # needed for remote/prod
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
NEXT_PUBLIC_XUNFEI_APP_ID / _API_KEY / _API_SECRET   # optional backup provider
```

Clerk keys are required for auth to work. `.env.example` omits them and the README
lists `CLERK_PUBLISHABLE_KEY`, but `@clerk/nextjs` reads
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` — use those names. The
NextAuth vars in `.env.example` are vestigial; NextAuth is not installed.

`DB_FALLBACK_COOLDOWN_MS` (default 60000) controls how long a DB failure keeps traffic
on the local store.

## Deployment

- **Vercel** is the primary target (`vercel.json`, `VERCEL_DEPLOY.md`).
- **Docker** (`Dockerfile`, node:18-alpine) and **Netlify** (`netlify.toml`) configs exist.
- **Aliyun ECS + PM2 + nginx** is the mainland path; dozens of `*.sh` / `*.exp` scripts
  at the repo root automate it. They are historical, overlapping, and largely
  one-off — read one before running it, and don't treat them as a maintained API.
- ⚠️ Several of those scripts (e.g. `deploy-to-production.sh`) contain **hardcoded
  server IPs and passwords**. Never add new secrets to tracked files, and don't echo
  those values into new code, logs, commits, or PR descriptions.

## Repo hygiene gotchas

- Duplicate/dead configs: `next.config.mjs` is shadowed by `next.config.js` (the real
  one — antd/lucide `modularizeImports`, `canvas: false` for pdf.js, console stripping
  in production). `postcss.config.correct.mjs` and `postcss.config.fixed.mjs` are dead;
  `postcss.config.js` is live.
- `app/components/LearningFlow/LearningSession.tsx.backup` and
  `chrome-extension-v1-backup/` are stale copies — don't edit or reference them.
- `tsconfig.tsbuildinfo` and `.DS_Store` are committed by accident; leave them alone
  rather than churning diffs.
- `tailwind.config.ts` starts with `// @ts-nocheck` and types `Config` as `any`.
- `package-lock.json` is in `.gitignore` yet tracked. Avoid regenerating it casually.
- Large components are common (`LearningSession.tsx` ~1.7k lines, `memory-db.ts` ~1.1k).
  Prefer surgical edits over rewrites.

## Working style for this repo

- App Router only — no `pages/` directory; API handlers are `route.ts` exporting
  `GET/POST/PATCH/DELETE`.
- API responses use `{ success: boolean, data?, error? }` with Chinese error strings.
- Client fetches should use `app/lib/apiClient.ts` (timeout/retry) and
  `app/lib/errorHandler.ts` (`handleError`, antd `message`) rather than bare `fetch`.
- Guard against `userId === null` (guest mode is a supported state in several modules).
- Before finishing a change: `npm run lint` and `npm run build`, and state plainly
  which routes you exercised manually.
