# 🔄 SkillSwitch

A skill-swapping app for students. List what you can teach and what you want to learn, find people whose lists match yours, schedule a session, and earn points once both of you confirm it happened.

## ✨ Features

- Email/password auth with email confirmation
- Profiles with bio, avatar, and up to 8 skills to teach and 8 to learn
- Find Pair: browse students, search by name or skill, see a match score
- Connection requests (send, accept, decline)
- Realtime messaging with unread badges
- Sessions: propose, accept, cancel, and confirm completion
- Points and a leaderboard (all time / this week)
- Skill suggestions from users
- Admin area: user management, fraud flags, points reverts, skill approvals

## ⚙️ How it works

🎯 **Match score.** The percentage of both people's learning goals the other person can cover. If I want ML and Stats, they want React, and they teach ML while I teach React, that's 2 of 3 goals covered, so 67%.

📅 **Sessions.** You can only schedule with accepted connections, at least 10 minutes ahead, for 15 to 240 minutes. A session is confirmed once the other person accepts, and completed once both people mark it done.

🏆 **Points.** Tutors get 5 points per 15 minutes, students get 2. There's a cap of 2 point-earning sessions per pair per week. The rules live in the `award_session_points()` SQL function; `lib/sessions.ts` only holds a copy for display, so keep them in sync.

🚩 **Fraud flags.** `run_fraud_scan()` flags repeated pairings, reciprocal swapping, session bursts, point spikes, and new accounts with a single partner. Admins review them.

## 🛠️ Tech stack

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint_9-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)

Also: Turbopack, Server Actions, Supabase Auth / Storage / Realtime (`@supabase/ssr`), lucide-react, clsx, tailwind-merge.

Most business logic (session responses, points, leaderboard, admin actions) is Postgres functions called through `supabase.rpc()`, with Row Level Security controlling access. Route protection and session refresh happen in `proxy.ts`.

## 🚀 Setup

You need Node 20+ and a Supabase project.

```bash
npm install
```

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The service role key is server-only and is used for admin actions like deactivating a login. Never expose it to the client.

Your Supabase project needs:

- Tables: `profiles`, `skills`, `user_skills`, `connections`, `messages`, `sessions`, `point_events`, `flags`, `skill_suggestions`, `admin_actions`
- The SQL functions the app calls (see `lib/database.types.ts` for the full list and signatures)
- A `handle_new_user()` trigger that creates a profile from signup metadata (`username`, `full_name`)
- A public storage bucket called `avatars`
- RLS policies on all tables
- Realtime enabled on `messages`
- Your site URL in the allowed redirect URLs, with the confirmation email pointing to `/auth/confirm`

Then:

```bash
npm run dev
```

To make yourself an admin:

```sql
update profiles set role = 'admin' where username = 'your_username';
```

To regenerate DB types after schema changes:

```bash
npx supabase gen types typescript --project-id <project-id> > lib/database.types.ts
```

## 📜 Scripts

- `npm run dev`: dev server
- `npm run build`: production build
- `npm run start`: run the build
- `npm run lint`: lint

## 📁 Project layout

```
app/(auth)/      login, signup
app/(app)/       find-pair, connections, messages, sessions,
                 leaderboard, profile, u/[username], admin
app/auth/confirm email confirmation route
components/      nav and UI primitives
lib/             Supabase clients, match logic, session rules, helpers
proxy.ts         auth gate and session refresh
```

## 📝 Notes

- This Next.js version has breaking changes (e.g. `proxy.ts` instead of `middleware.ts`). Check `node_modules/next/dist/docs/` if something behaves unexpectedly.
- `lib/supabase/admin.ts` bypasses RLS and is marked `server-only`. Don't import it from client code.
- Use `getUser()`, not `getSession()`, for server-side auth checks.
