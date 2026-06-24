# Ranked Runs

Ranked Runs is a mobile-first 1v1 basketball Elo ranking app for multiple communities. A user can join or create communities such as a university, park, shul, gym, or friend group. Each community has its own leaderboard, challenges, results, and Elo ratings.

The MVP is intentionally scoped: Google login, community onboarding, leaderboards, challenges, result submission, and atomic Elo updates.

## Tech Stack

- Next.js App Router
- TypeScript
- Supabase Auth with Google OAuth
- Supabase Postgres with Row Level Security
- Tailwind CSS
- Bun for local package commands
- Vercel-compatible deployment

## Local Setup

1. Install dependencies:

```bash
bun install
```

2. Create an environment file:

```bash
cp .env.example .env.local
```

3. Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` is included as an example but is not required by the current MVP.

## Supabase Setup

Create a Supabase project, then run the migration in:

```text
supabase/migrations/001_ranked_runs_schema.sql
```

The migration creates:

- `profiles`
- `communities`
- `community_memberships`
- `community_player_stats`
- `challenges`
- `results`
- RLS helper functions and policies
- `join_community` RPC
- `submit_result` RPC for atomic result insertion, Elo updates, and challenge completion

## Google OAuth Setup

In Supabase:

1. Open Authentication -> Providers.
2. Enable Google.
3. Add your Google OAuth client ID and secret.
4. Add redirect URLs:

```text
http://localhost:3000/auth/callback
https://your-vercel-domain.vercel.app/auth/callback
```

Set `NEXT_PUBLIC_SITE_URL` to the deployed URL in Vercel.

## Seed Demo Data

Run:

```text
supabase/seed.sql
```

Seeded communities:

- YU 1v1 Rankings
- Washington Heights Park Runs

The YU demo leaderboard includes Daniel S., Ari M., Shachar K., Yosef K., and Ezra L.

## Run Locally

```bash
bun dev
```

Build before deployment:

```bash
bun run build
```

## Deployment Notes

Deploy to Vercel as a standard Next.js app. Add the same environment variables in Vercel project settings. Supabase Auth redirect URLs must include the Vercel callback URL.

## Current MVP Limitations

- No chat, payments, social feed, comments, tournaments, or complex scheduling.
- Result submission trusts involved players and finalizes immediately.
- Domain-restricted joining is enforced by the database against the authenticated user's email domain.
- Admin features are limited to creating and updating communities through the data model; there is no advanced admin dashboard yet.
