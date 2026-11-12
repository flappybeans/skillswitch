# SkillSwitch

**Trade skills with other students. Teach one, learn one.**

SkillSwitch is a peer-to-peer skill exchange for students. You list what you can teach and what you want to learn, get matched with people whose lists complement yours, connect, schedule a session, and earn points when both of you confirm it happened. Points drive a leaderboard, and a built-in fraud-detection and admin console keeps the system honest.

---

## Features

### For students
- **Sign up / log in** with email and password. Email confirmation is supported, and deactivated accounts are blocked from logging in.
- **Profile** with full name, unique username, bio (up to 300 characters), and avatar. Avatars are center-cropped to 256×256 JPEG in the browser before upload.
- **Skills** you can **teach** and **learn** (up to **8 of each**). Can't find a skill? Suggest one (2–40 characters; `C++`, `UI/UX`, and `R&D` all work) and an admin will review it.
- **Find Pair**: browse active students, filter by name or skill, and see a **match score** for each one.
- **Connections**: send, accept, and decline requests. Declined requests are silent to the sender (they still just see "Requested"), and the person who declined can change their mind later.
- **Messaging** between students with realtime updates, unread badges in the nav, and 2,000-character messages.
- **Sessions**: propose a teaching or learning session with a connection, accept or decline incoming proposals, cancel, and confirm completion.
- **Leaderboard**: top 25 students, **all time** or **this week**.
- **Public profiles** at `/u/[username]`.
- **Light and dark mode** that follow your system setting.

### For admins
- Dashboard stats: users, active users, open flags, sessions and points in the last 7 days.
- **Fraud flags** with one-click dismiss or action, plus a manual **scan** button.
- **User management**: deactivate or reactivate accounts (with a reason), and view a per-user detail page.
- **Points ledger**: revert individual point events.
- **Skill catalog**: manage skills and approve, reject, or merge user suggestions.
- **Audit log** of every admin action.

---

## How it works

### Match score
The score (0–100) is the share of **both people's learning goals** that the other person can cover.

```
covered = (skills they teach that I want) + (skills I teach that they want)
wanted  = (my learning goals) + (their learning goals)
score   = round(covered / wanted * 100)
```

Example: I want ML and Stats, they want React. They teach ML and I teach React, so `covered = 2`, `wanted = 3`, and the score is **67%**. A match is **mutual** when each side can teach the other something.

### Session lifecycle

```
pending ──accept──▶ confirmed ──both mark done──▶ completed
   │                    │
   └──cancel / decline──┴──▶ cancelled
pending, start time passed with no answer ──▶ expired (derived for display)
```

Rules:
- You can only schedule sessions with **accepted connections**.
- Sessions must start **at least 10 minutes** in the future.
- Allowed durations: **15, 30, 45, 60, 90, 120, 180, 240 minutes**.
- A session becomes completable once its end time passes, and points are awarded only after **both the tutor and the student confirm**.

### Points

| Role | Points per 15-minute block |
|---|---|
| Tutor | **5** |
| Student | **2** |

- Duration is rounded down to whole 15-minute blocks, with a minimum of one block.
- A **weekly pair cap of 2** limits how many sessions between the same two people earn points per week.
- Every award is recorded in a `point_events` ledger (`taught_session`, `learned_session`, `weekly_pair_cap`, or `revert:…`), so admins can audit and reverse it.

> The display constants live in `lib/sessions.ts`, but the real rules are enforced by the `award_session_points()` database function. Keep the two in sync.

### Fraud detection
`run_fraud_scan()` raises flags for admin review:

| Flag | Meaning |
|---|---|
| `pair_repeat` | Many completed sessions with the same person in a short window |
| `reciprocal_swaps` | Teaching and learning with the same partner back and forth |
| `burst_sessions` | Unusually many session minutes on a single day |
| `point_spike` | 7-day points far above the platform median |
| `new_account_one_partner` | New account whose points all came from one partner |

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org) 16 (App Router, Turbopack, `cacheComponents`, `partialPrefetching`) |
| UI library | React 19 |
| Language | TypeScript 5 (`strict`) |
| Styling | Tailwind CSS 4 via `@tailwindcss/turbopack`, with CSS-variable theme tokens |
| Fonts | `next/font/google`: Bricolage Grotesque (display) and Geist (body) |
| Icons | `lucide-react` |
| Class utilities | `clsx` and `tailwind-merge` |
| Backend | [Supabase](https://supabase.com): Postgres, Auth, Storage, Realtime |
| Supabase clients | `@supabase/supabase-js` and `@supabase/ssr` (cookie-based sessions) |
| Server safety | `server-only` guards the service-role client |
| Linting | ESLint 9 with `eslint-config-next` (core-web-vitals and TypeScript) |
| Tooling | Supabase CLI (`supabase`) for generating DB types |

### Architecture notes
- **Server Actions** handle all mutations (`"use server"`), and every argument from the browser is validated server-side (UUID checks, enum checks, length limits).
- **Business logic lives in Postgres.** Session responses, cancellation, point awards, leaderboards, and admin operations are SQL functions called with `supabase.rpc(...)`. Row Level Security (RLS) enforces who can read or write what.
- **User-safe errors:** SQL functions raise SQLSTATE `SK001` for messages that are safe to show users. Anything else becomes a generic message.
- **Auth gate in `proxy.ts`:** on every non-static request it verifies the user with `supabase.auth.getUser()` (never `getSession()`), signs out deactivated users, restricts `/admin/*` to admins, and redirects logged-out users to `/login?next=…`.
- **Service-role client** (`lib/supabase/admin.ts`) bypasses RLS. It is marked `server-only`, so the build fails if a client component imports it, and it is used only after an admin check.
- **Security headers** are set globally: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, and a restrictive `Permissions-Policy`.
- **Typed database:** `lib/database.types.ts` is generated by the Supabase CLI, and `lib/types.ts` derives row types from it.

---

## Project structure

```
app/
├── page.tsx                  # Landing page
├── (auth)/                   # login, signup, auth server actions
├── auth/confirm/route.ts     # Email confirmation (OTP token hash) handler
└── (app)/                    # Authenticated area (shared nav layout)
    ├── find-pair/            # Browse and match students
    ├── connections/          # Requests and connected students
    ├── messages/             # Inbox and per-user chat threads (realtime)
    ├── sessions/             # Propose, accept, cancel, complete sessions
    ├── leaderboard/          # All-time and weekly rankings
    ├── profile/              # Edit profile, avatar, skills, suggest a skill
    ├── u/[username]/         # Public profile
    ├── admin/                # Stats, flags, users, skills, audit tools
    └── design/               # Internal UI kit preview page
components/                   # Nav, unread badge, local-time, ui/* primitives
lib/
├── supabase/                 # server, browser, admin, env, session-proxy helpers
├── match.ts                  # Match score logic
├── sessions.ts               # Durations, point constants, status helpers
├── flags.ts                  # Fraud flag titles and descriptions
├── database.types.ts         # Generated Supabase types
└── …                         # auth, connections, messages, leaderboard, form helpers
proxy.ts                      # Session refresh and route protection
```

---

## Getting started

### Prerequisites
- Node.js 20 or newer
- A [Supabase](https://supabase.com) project (or the Supabase CLI for local development)
- npm, yarn, pnpm, or bun

### 1. Install

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Server-only. Never expose this to the browser or commit it.
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key used by browser and server clients |
| `SUPABASE_SERVICE_ROLE_KEY` | For admin features | Used only for privileged admin actions such as banning a login |

The app throws at startup if a required public variable is missing.

### 3. Set up Supabase

The app expects the following in your Supabase project. The schema and SQL functions are not part of the source files, so you need to create them (for example as migrations).

**Tables:** `profiles`, `skills`, `user_skills`, `connections`, `messages`, `sessions`, `point_events`, `flags`, `skill_suggestions`, `admin_actions`

**SQL functions (RPC):** `award_session_points`, `respond_to_session`, `cancel_session`, `mark_session_done`, `lock_my_session`, `leaderboard`, `my_conversations`, `are_connected`, `is_active_user`, `is_admin`, `run_fraud_scan`, `fraud_sides`, `admin_stats`, `admin_set_active`, `admin_revert_event`, `admin_resolve_flag`, `admin_resolve_suggestion`

**Also required:**
- A `handle_new_user()` trigger on `auth.users` that creates a `profiles` row from the signup metadata (`username`, `full_name`).
- A **public Storage bucket** named `avatars` (files are stored as `<user-id>/<timestamp>.jpg`).
- **RLS policies** on every table.
- A trigger or constraint limiting each user to 8 skills per kind (matches `MAX_SKILLS_PER_KIND`).
- **Realtime** enabled on `messages`.
- **Auth:** email and password provider. For email confirmation, point the confirmation link at `/auth/confirm` with `token_hash` and `type`.

To regenerate types after changing the schema:

```bash
npx supabase gen types typescript --project-id <your-project-id> > lib/database.types.ts
```

### 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Making yourself an admin
Sign up normally, then set your profile's role in the database:

```sql
update profiles set role = 'admin' where username = 'your_username';
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint with ESLint |

---

## Validation rules at a glance

| Field | Rule |
|---|---|
| Username | 3–20 characters: `a–z`, `0–9`, `_` (stored lowercase, unique) |
| Full name | 1–80 characters |
| Password | At least 8 characters |
| Bio | Up to 300 characters |
| Message | Up to 2,000 characters |
| Avatar | Picked file up to 10 MB, output as 256×256 JPEG |
| Skills | Up to 8 teach and 8 learn per user |
| Skill suggestion | 2–40 characters |

---

## Deployment

Deploy to any Next.js-compatible host (for example [Vercel](https://vercel.com/new)). Set the three environment variables in your host's dashboard and add your production URL to your Supabase project's allowed redirect URLs so email confirmation works.

---

## Notes for contributors

- This project uses a recent Next.js with breaking changes (for example `proxy.ts` instead of `middleware.ts`, and `cacheComponents`). Check `node_modules/next/dist/docs/` before relying on older conventions. See `AGENTS.md`.
- Never import `lib/supabase/admin.ts` from client code.
- Never use `getSession()` for server-side access decisions. Use `getUser()`.
- If you change point values or caps, update both the SQL function and `lib/sessions.ts`.
