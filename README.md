# TeamPost

TeamPost is a frontend-first team collaboration app for managing social posts, tickets, projects, and shared team knowledge in one workspace. It uses Supabase for auth, database, realtime sync, and row-level security, with Cloudinary for image uploads.

## What It Does

- Team-scoped workspaces with invite-code join flow
- Google/Supabase authentication
- Post planning and review board
- Ticket/task workflow with assignees, comments, reopen flow, and status gates
- Project planning with linked tasks and member assignments
- Shared info boxes for notes, prompts, keys, and assets
- Realtime updates for team activity

## Stack

- React 19
- Vite
- Supabase
- Tailwind CSS
- Framer Motion
- Cloudinary

## Repo Structure

```text
.
├── db/
│   ├── reset.sql
│   └── schema.sql
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.example
└── README.md
```

## Local Setup

1. Install frontend dependencies:

```bash
cd frontend
npm install
```

2. Create a local env file from the example:

```bash
cp .env.example .env
```

3. Fill in the real values in `frontend/.env`.

4. In Supabase SQL Editor:
   Run `db/schema.sql`.

   If you need a clean wipe first:
   Run `db/reset.sql`, then run `db/schema.sql`.

5. Start the app:

```bash
npm run dev
```

## Environment Variables

The frontend expects these values:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
VITE_GOOGLE_CLIENT_ID=
```

## Supabase Notes

- Do not disable RLS.
- The app relies on `db/schema.sql` for tables, policies, helper functions, and RPCs.
- Project and task writes are routed through SQL RPCs to avoid brittle client-side insert/update policy failures.
- After schema changes, rerun `db/schema.sql`.

## Security / Pre-Publish Checklist

Before creating a public repo:

- Keep real env files out of version control.
- Do not commit any service-role keys, admin keys, or SQL export files with live data.
- Review Supabase Auth redirect URLs and allowed origins.
- Review Cloudinary upload preset settings and use unsigned presets only where intended.
- Confirm no generated `dist/` or `node_modules/` folders are committed.
- Confirm no local notes, prompts, or scratch files are committed.
- Confirm `db/schema.sql` is the only schema source of truth.
- Verify the app builds locally with:

```bash
cd frontend
npm run build
```

## Current Product Areas

- `Posts`: shared post planning and review
- `Work`: ticket/task workflow
- `Projects`: planning and delivery tracking
- `Info`: team knowledge base
- `Settings`: profile and workspace member management

## Important Files

- [`db/schema.sql`](db/schema.sql)
- [`db/reset.sql`](db/reset.sql)
- [`frontend/src/lib/api.js`](frontend/src/lib/api.js)
- [`frontend/src/lib/supabase.js`](frontend/src/lib/supabase.js)

## Commit Guidance

Safe to commit:

- source code
- SQL schema files
- `.env.example`
- `package.json` and lockfiles
- public assets that are intentionally part of the app

Do not commit:

- `.env`
- generated builds
- dependency directories
- local prompt files
- real API keys or service credentials
