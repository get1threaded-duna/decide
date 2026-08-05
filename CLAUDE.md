# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this is

**Decide** is a Next.js 14 lifestyle-recommendation app. It shows a signed-in
user a daily 6-card feed — one card per **modality** (eat, watch, listen, read,
do, connect) — each pick chosen by a rule-based scoring engine and annotated
with a one-line AI "reason" streamed from Claude. Saving and ignoring cards
feeds a per-user learning loop; a Stripe-gated **Pro** plan unlocks a "Tune me"
panel and custom contexts.

The project was built week-by-week (see git history: `week1`…`week4`); comments
sometimes reference "Week N" as shorthand for shipped/pending scope.

## Stack

- **Next.js 14.2** App Router, React 18, TypeScript (`strict`)
- **Supabase** — Postgres + Auth (magic-link OTP), `@supabase/ssr` for cookie-based sessions
- **Anthropic SDK** (`@anthropic-ai/sdk`) — streaming reasons via `claude-haiku-4-5-20251001`
- **Stripe** — subscription checkout + webhooks
- **Tailwind CSS 3.4** + **shadcn/ui** (Radix primitives, `base-ui`, `lucide-react` icons)
- **@dnd-kit** — drag-to-reorder bento tiles on the landing page
- Path alias `@/*` → repo root (see `tsconfig.json`)

## Commands

```bash
npm run dev     # local dev server on :3000
npm run build   # production build
npm run start   # serve production build
npm run lint    # next lint (eslint: next/core-web-vitals + next/typescript)
```

There is **no test suite** and no formatter config — lint is the only automated
check. Run `npm run lint` before finishing changes.

## Environment variables

Nothing runs meaningfully without these (no `.env.example` exists — this is the
reference list):

| Variable | Used by |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server + webhook |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Stripe webhook only (bypasses RLS) |
| `ANTHROPIC_API_KEY` | `/api/reason` |
| `STRIPE_SECRET_KEY` | checkout + webhook |
| `STRIPE_WEBHOOK_SECRET` | webhook signature verification |
| `STRIPE_PRICE_PRO_MONTHLY` / `STRIPE_PRICE_PRO_ANNUAL` | checkout price ids |

## Directory map

```
app/
  page.tsx              Landing: draggable bento dashboard (client), category → /dashboard
  layout.tsx            Root layout, Fraunces (serif) + JetBrains Mono fonts
  globals.css           Design tokens (CSS vars), keyframes, base styles
  signin/page.tsx       Magic-link email form
  dashboard/            The core feed (server component + live cards + server actions)
  tune/                 Pro-only "Tune me" panel (patterns, saves, interest editor)
  pricing/              Plan comparison + Stripe checkout button
  preview/page.tsx      Static component showcase (mock data, no auth) — dev aid
  api/
    reason/route.ts     POST → streams a Claude one-liner (text/plain stream)
    checkout/route.ts   POST → creates Stripe Checkout session
    stripe/webhook/     POST → syncs subscription status to users.plan
  auth/
    callback/route.ts   OAuth/OTP code exchange → session
    signout/route.ts    POST sign-out
components/
  decide/               App-specific components (FeedCard, ContextBar, tiles, etc.)
  ui/                   shadcn primitives (button, card, dialog, tabs, input, badge)
lib/
  decide/               Domain core — see below
  supabase/             client.ts (browser) + server.ts (RSC/route handlers)
  stripe/               server.ts (lazy client) + plans.ts (plan defs + price ids)
  utils.ts              cn() — clsx + tailwind-merge
supabase/migrations/    Raw SQL (0001 schema+RLS, 0002 dashboard layout)
middleware.ts           Session refresh + route protection
```

## The recommendation engine (`lib/decide/`)

This is the heart of the app. All content is **static, hardcoded, and typed** —
there is no CMS or external content API.

- **`types.ts`** — `Modality`, `Item`, `DecideContext`, `FeedbackEntry`, pattern types.
- **`catalog.ts`** — the content: `catalog: Record<Modality, Item[]>` (8 items per
  modality). Each `Item` has `tags` (used for scoring) and a `fallback` reason
  (shown if the AI stream fails). Also exports `allInterests` and `findItem(id)`.
  **Item ids are stable string keys** (`e1`, `w3`, …) referenced across the DB
  and reason API — do not renumber them.
- **`contexts.ts`** — 5 preset `DecideContext`s (home, la, tokyo, rainy,
  saturday) describing time/place/weather/vibe. `DEFAULT_CONTEXT_ID = "home"`.
- **`scoring.ts`** — `score()` sums tag matches against the active context
  (city +4, tod +3, dow/season/weather/vibe +2, each interest +1, saved +5,
  ignored −10). `pick(cat, ctx, swap, interests, feedback)` ranks a modality's
  items and returns the `swap`-th non-ignored one. `MODALITIES` is the feed order.
- **`patterns.ts`** — `derivePatterns(log)` turns the feedback log into
  recent saves/passes and `topTags` (a tag saved ≥2× in the last 5 saves,
  excluding `GENERIC_TAGS`). This drives the "Decide is noticing…" banner and
  the Tune panel.

When adding content, keep tag vocabulary consistent with existing items and
`allInterests` — scoring is purely tag-string matching, so typos silently
produce zero-weight tags.

## Data & auth flow

- **Auth**: magic-link OTP (`signInWithOtp`). `middleware.ts` refreshes the
  session on every request, protects `/dashboard` (redirect to `/signin` when
  logged out), and bounces logged-in users off `/signin`.
- **Two Supabase clients**: `lib/supabase/client.ts` (browser, `'use client'`)
  and `lib/supabase/server.ts` (RSC + route handlers, reads `cookies()`).
  Note: `cookies()` is used **synchronously** — this is Next 14, not 15.
- **Server Components fetch data directly** (see `dashboard/page.tsx`): parallel
  Supabase reads for saved items, feedback log, plan, and profile interests.
- **Mutations are Server Actions** (`"use server"`) — `dashboard/actions.ts`
  (`toggleSave`, `logIgnore`) and `tune/actions.ts` (`saveInterests`). They call
  `revalidatePath()` to refresh the affected routes.
- **RLS is on for every table**; policies restrict rows to `auth.uid()`. Only the
  Stripe webhook uses the service-role key (it acts on behalf of Stripe, not a
  user).
- A Postgres trigger (`handle_new_user`) auto-creates `users` + `profiles` rows
  on `auth.users` insert.

## Database schema

Migrations are plain SQL in `supabase/migrations/`, applied in order. Tables:
`users` (plan + stripe_customer_id), `profiles` (interests/confidence jsonb),
`feedback_log` (save/swap/ignore/open + `item_snapshot`), `saved_items`,
`contexts_cache`, and `user_dashboard_layout` (bento tile order). There is **no
migration runner in the repo** — apply SQL via the Supabase dashboard/CLI. When
changing schema, add a **new numbered migration** rather than editing an
existing one.

## The AI reason stream (`/api/reason`)

`FeedCardLive` (client) POSTs `{itemId, category, contextId, interests}` and
reads a **plain-text stream** (not SSE), appending chunks as they arrive with a
typing cursor. The route re-derives the user's patterns server-side, builds a
prompt, and streams from Claude Haiku with a cached system prompt. On any error
it emits the item's `fallback` string so a card always shows a reason. The
client keys each request by `reasonKey` and aborts/ignores stale streams when
the key changes.

## Stripe / plans

- Free vs Pro defined in `lib/stripe/plans.ts`. Pro gates `/tune` and (per copy)
  custom contexts.
- Checkout: `pricing` → `SubscribeButton` → `POST /api/checkout` → Stripe session
  → redirect. Success returns to `/dashboard?upgraded=1`.
- Webhook (`/api/stripe/webhook`) verifies the signature and flips `users.plan`
  on `checkout.session.completed`, `customer.subscription.updated/deleted`.
- Currently wired for **test mode** (see pricing page copy).

## Conventions

- **Styling**: Tailwind utility classes + CSS custom properties. The Decide
  palette lives in `app/globals.css` as `--decide-*` and `--cat-*` vars, surfaced
  through `tailwind.config.ts` (e.g. `text-decide-accent`) — but much of the code
  also references `var(--decide-…)` inline via arbitrary values. Match the
  surrounding file's approach. Warm neutral palette; serif (Fraunces) for
  headings, mono for metadata/labels. Dark mode is intentionally a no-op mirror.
- **Components**: `"use client"` only where interactivity/hooks are needed;
  prefer server components + server actions for data. Use `cn()` for conditional
  classes. Icons from `lucide-react`.
- **shadcn/ui**: configured via `components.json` (style "default", RSC on,
  base color slate). Add primitives under `components/ui/`, app components under
  `components/decide/`.
- **Modality is the central enum** — six values, ordered by `MODALITIES`. Any new
  feature touching cards should thread `Modality` through rather than raw strings.
- No test files, no Prettier — keep diffs minimal and consistent with existing
  formatting (2-space indent, double quotes in TS, aligned object literals in the
  catalog).

## Git workflow

- Feature branches merged via PR (`feat(weekN): …`, `feat: …`, `chore: …`);
  history is linear with squash-style merge commits.
- Default branch is `main`. Develop on the assigned feature branch, commit with
  clear messages, and push — do not open a PR unless explicitly asked.
