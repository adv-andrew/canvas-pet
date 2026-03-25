# Canvas Pet

A Chrome extension that surfaces your Canvas LMS assignments and announcements in a popup, backed by a Next.js API and Supabase database. A companion web app lets users sign in with Google and view the same data from any browser.

## Table of Contents

- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Branch Strategy](#branch-strategy)
- [Pull Request Workflow](#pull-request-workflow)
- [Contributing](#contributing)

---

## How It Works

1. **Content script** is injected into every Canvas page and reads assignment, announcement, and user data directly from the Canvas JavaScript environment (`window.ENV`).
2. When the user opens the **extension popup**, it asks the content script for that data via `chrome.runtime.sendMessage`.
3. The popup calls **POST /api/auth/extension** on the backend. The backend creates or finds a Supabase Auth account keyed to the Canvas user ID (using an HMAC-derived password so no password is ever shared with the client), then returns JWT session tokens.
4. Subsequent requests (fetch saved assignments, save/unsave) attach the JWT as a Bearer token. The backend verifies it and proxies writes through the Supabase Admin SDK (bypassing Row Level Security where needed).
5. The **web app** uses Google OAuth via Supabase. After linking a Google account from the extension popup (`chrome.identity.launchWebAuthFlow`), signing in on the web app gives access to the same `canvas_users` row and all saved assignments.

---

## Project Structure

```
canvas-pet/
├── backend/                        # Next.js 15 API-only backend
│   ├── app/
│   │   └── api/                    # Next.js App Router route handlers
│   │       ├── auth/
│   │       │   ├── route.ts        # POST /api/auth — upsert canvas_users row (requires JWT)
│   │       │   ├── extension/
│   │       │   │   └── route.ts    # POST /api/auth/extension — passwordless session bootstrap (no JWT needed)
│   │       │   └── me/
│   │       │       └── route.ts    # GET /api/auth/me — return profile info for the signed-in user
│   │       └── assignments/
│   │           ├── route.ts        # GET (list saved IDs) + POST (save assignment)
│   │           └── [id]/
│   │               └── route.ts    # DELETE /api/assignments/:id — unsave an assignment
│   ├── migrations/
│   │   └── schema.sql              # Full Postgres schema (run once on a fresh Supabase project)
│   ├── src/
│   │   ├── lib/
│   │   │   ├── supabaseAdmin.ts    # Supabase client initialized with the service-role key (server only)
│   │   │   └── verifyJwt.ts        # Verifies Supabase JWTs from incoming requests
│   │   ├── routes/                 # Re-exports of service functions for non-Next.js consumers (tests, CLI)
│   │   ├── schemas/
│   │   │   ├── auth.ts             # Zod schemas for auth request bodies
│   │   │   ├── assignments.ts      # Zod schemas for assignment request bodies
│   │   │   └── canvas.ts           # Zod schemas for Canvas API response shapes
│   │   └── services/
│   │       ├── authService.ts      # signInExtensionUser (create/find Supabase user) + upsertCanvasUser
│   │       ├── assignmentService.ts# fetchSavedAssignments, saveAssignment, unsaveAssignment
│   │       └── canvasTokenService.ts # Helpers for storing/retrieving Canvas API tokens
│   ├── next.config.ts
│   └── tsconfig.json
│
├── frontend/
│   └── react-app/                  # Vite + React project — builds both the extension and the web app
│       ├── manifest.json           # Chrome Extension Manifest V3
│       ├── popup.html              # HTML shell for the extension popup
│       ├── index.html              # HTML shell for the standalone web app
│       ├── vite.config.ts          # Multi-entry build: popup, background, content_script, webapp
│       └── src/
│           ├── content_script/
│           │   └── content.ts      # Injected into Canvas pages; reads window.ENV and responds to popup messages
│           ├── service_worker/
│           │   └── background.ts   # Extension service worker (background.js); currently minimal
│           ├── popup/              # Extension popup UI
│           │   ├── App.tsx         # Root popup component — composes hooks and passes props to Dashboard
│           │   ├── main.tsx        # Popup entry point
│           │   ├── popup.css       # Popup-specific styles
│           │   ├── components/
│           │   │   ├── Dashboard.tsx   # Main popup view: tabs for assignments and announcements, refresh, Google link button
│           │   │   └── NotOnCanvas.tsx # Shown when the active tab is not a Canvas page
│           │   ├── hooks/
│           │   │   └── useCanvasData.ts # Orchestrates the full data flow: content script → auth → saved IDs → state
│           │   ├── lib/
│           │   │   ├── api.ts          # Typed wrappers around backend API calls (uses supabaseAuthClient for tokens)
│           │   │   ├── auth.ts         # linkGoogleAccount() — runs OAuth via chrome.identity.launchWebAuthFlow
│           │   │   ├── storage.ts      # chrome.storage helpers for persisting extension state
│           │   │   └── supabaseAuthClient.ts # Supabase anon client used by the extension (holds the session JWT)
│           │   └── types/              # Popup-local TypeScript types
│           ├── shared/             # Code shared between the popup and the web app
│           │   ├── components/
│           │   │   ├── AssignmentCard.tsx   # Renders a single assignment with save/unsave action
│           │   │   ├── AnnouncementCard.tsx # Renders a single Canvas announcement
│           │   │   ├── Dashboard.tsx        # Shared dashboard layout used by both popup and webapp
│           │   │   └── StatusBadge.tsx      # Due-date / status indicator chip
│           │   ├── lib/
│           │   │   └── apiClient.ts    # Raw fetch helpers with no Supabase or Chrome dependency; callers supply the token
│           │   └── types/
│           │       └── canvas.ts       # Shared Canvas types (CanvasPlannerItem, TrackedAssignment, etc.)
│           └── webapp/             # Standalone web app (sign in with Google, view saved assignments)
│               ├── App.tsx         # React Router setup + OAuth callback handler
│               ├── webapp.css      # Web app styles
│               ├── lib/
│               │   ├── api.ts          # API wrappers for the web app (thin layer over shared/lib/apiClient.ts)
│               │   └── supabaseClient.ts # Supabase anon client for the web app (separate from the extension client)
│               └── pages/
│                   ├── SignIn.tsx       # Google sign-in page
│                   └── Dashboard.tsx   # Authenticated dashboard — loads saved assignments via backend
│
├── docs/                           # Project documentation (proposals, branching guide, risk management)
├── tests/                          # Integration / unit tests (Jest or Vitest)
├── .github/workflows/ci.yml        # CI: lint + build checks on every PR
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension UI | React 18 + TypeScript, Vite |
| Web app | React 18 + React Router, same Vite build |
| Backend | Next.js 15 (App Router, API routes only) |
| Database | Supabase (Postgres + Auth) |
| Auth — extension | HMAC-derived password, Supabase session tokens |
| Auth — web app | Google OAuth via Supabase |
| Validation | Zod |
| CI | GitHub Actions |

---

## Getting Started

### Prerequisites

- Node.js v18+
- A Supabase project (get the URL, anon key, and service-role key)
- A `.env.local` in `backend/` and `frontend/react-app/` (see `.env.development` for variable names)

### Backend

```bash
cd backend
npm install
npm run dev        # starts Next.js dev server on http://localhost:3001
```

Apply the database schema once on a fresh Supabase project:

```sql
-- paste contents of backend/migrations/schema.sql into the Supabase SQL editor
```

### Frontend (extension + web app)

```bash
cd frontend/react-app
npm install
npm run build      # outputs to dist/
```

Load the extension in Chrome:

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select `frontend/react-app/dist/`

For the web app dev server:

```bash
npm run dev        # Vite dev server — serves the web app at http://localhost:5173
```

---

## Section Overviews

### Backend (`backend/`)

A Next.js project used exclusively as an HTTP API — no pages, no SSR. Every route lives under `app/api/`. Business logic sits in `src/services/`, keeping route handlers thin. The Supabase Admin SDK (initialized with the service-role key) is only ever used server-side, which lets the backend bypass Row Level Security for trusted writes while still enforcing RLS for all client-initiated reads. Incoming JWTs are verified in `src/lib/verifyJwt.ts` before any protected route runs.

The key auth endpoint is **POST /api/auth/extension**: it accepts a Canvas user ID and institution URL, derives a deterministic HMAC password from them using `EXTENSION_SECRET`, and calls the Supabase Admin API to create-or-find that user's account. It returns access and refresh tokens that the extension stores locally — no password or secret ever leaves the server.

### Frontend — Extension Popup (`frontend/react-app/src/popup/`)

The popup has a single main hook (`useCanvasData`) that drives everything: it messages the content script for Canvas data, calls the extension auth endpoint if no session exists, then fetches saved assignment IDs. The UI is split between a Dashboard (assignment/announcement tabs, save/unsave actions, Google link button) and a NotOnCanvas fallback shown when the active tab is not a Canvas page.

`lib/api.ts` is the only file that talks to the backend; it reads the session token from `supabaseAuthClient` before every authenticated call. `lib/auth.ts` handles Google account linking using `chrome.identity.launchWebAuthFlow`, which is the only way to complete an OAuth redirect inside an extension popup.

### Frontend — Web App (`frontend/react-app/src/webapp/`)

A small React Router app built from the same Vite config (separate entry point: `index.html` → `webapp.js`). Users sign in with Google; Supabase handles the OAuth flow and redirects back to `/auth/callback` where the code is exchanged for a session. The Dashboard page then calls the backend with the Google-issued JWT to fetch saved assignments — the same rows created by the extension.

### Frontend — Shared (`frontend/react-app/src/shared/`)

Components and API helpers that have no dependency on either Chrome APIs or Supabase directly. `apiClient.ts` is pure `fetch` — callers from both the popup and the web app pass their own token in. This makes it straightforward to reuse the same UI components and request logic across both surfaces.

### Content Script (`frontend/react-app/src/content_script/content.ts`)

Injected by the extension into every `*.instructure.com` page. It reads from Canvas's `window.ENV` object (the same data Canvas uses to bootstrap its own React app) and listens for a `GET_CANVAS_DATA` message from the popup. On request it fetches the planner and announcements from the Canvas API using the user's own session cookies (no token needed — the request is same-origin), then sends everything back to the popup.

### Database (`backend/migrations/schema.sql`)

Two tables:

- **`canvas_users`** — one row per Canvas identity. Stores `canvas_user_id`, `institution_url`, `display_name`, `email`, and gamification columns (`happiness_score`, `reward_points`). The primary key is a UUID that matches the Supabase Auth `uid`, so RLS policies can use `auth.uid() = id` directly. The gamification columns can only be modified by the service role (the backend), not by the client.
- **`saved_assignments`** — one row per pinned assignment, with a foreign key to `canvas_users.canvas_user_id`. A unique constraint prevents duplicate saves. RLS policies ensure users can only read and write rows that belong to their own Canvas account.

---

## Branch Strategy

| Branch | Purpose | Protected |
|---|---|---|
| `main` | Production-ready code | Yes |
| `feature/*` | New features | No |
| `bugfix/*` | Bug fixes | No |
| `hotfix/*` | Urgent production fixes | No |
| `docs/*` | Documentation updates | No |

- All work happens on branches created from `main`.
- Direct pushes to `main` are **not allowed**.
- See [docs/branching.md](docs/branching.md) for full details.

## Pull Request Workflow

1. Create a branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name main
   ```
2. Commit with clear, prefixed messages (`feat:`, `fix:`, `refactor:`, `chore:`, etc.).
3. Push and open a PR against `main`.
4. Ensure CI checks pass (lint + build).
5. Request at least **one reviewer** to approve.
6. Squash-merge into `main` once approved.
7. Delete the branch after merge.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
