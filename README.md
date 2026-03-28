# Canvas Pet

A Chrome extension that surfaces your Canvas LMS assignments and announcements in a sidebar panel, backed by a Next.js API and Supabase database. A companion web app lets users sign in with Google and view the same data from any browser.

## Table of Contents

- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Authentication](#authentication)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Section Overviews](#section-overviews)
- [Branch Strategy](#branch-strategy)
- [Pull Request Workflow](#pull-request-workflow)
- [Contributing](#contributing)

---

## How It Works

1. **Content script** is injected into every Canvas page. It fetches assignment, announcement, and user data from the Canvas REST API using the browser's own session cookies (same-origin, no token needed), then caches it in `chrome.storage.session` via the background service worker.
2. The content script injects a **sidebar panel** (iframe) directly into the Canvas page. The panel communicates with the content script via `window.postMessage`.
3. When the panel opens, it calls **POST /api/auth/canvas-signin** on the backend. The backend creates or finds a Supabase Auth account keyed to the Canvas user ID (using an HMAC-derived password so no secret is ever shared with the client), then returns JWT session tokens.
4. Subsequent requests (fetch saved assignments, save/unsave) attach the JWT as a Bearer token. The backend verifies it and proxies writes through the Supabase Admin SDK.
5. On **localhost**, the content script skips panel injection and instead bridges the cached Canvas data to the web app via `window.postMessage`, allowing the web app to display live assignment data natively.
6. The **web app** uses Google OAuth via Supabase. After clicking "Open Web App" from the extension panel, the web app automatically links the Google account to the same `canvas_users` row, giving access to all saved assignments.

---

## Project Structure

```
canvas-pet/
├── backend/                        # Next.js 15 API-only backend
│   ├── app/
│   │   ├── api/                    # Next.js App Router route handlers
│   │   │   ├── auth/
│   │   │   │   ├── route.ts        # POST /api/auth — upsert canvas_users row (requires JWT)
│   │   │   │   ├── canvas-signin/
│   │   │   │   │   └── route.ts    # POST /api/auth/canvas-signin — passwordless session bootstrap (no JWT needed)
│   │   │   │   ├── profile/
│   │   │   │   │   └── route.ts    # GET /api/auth/profile — return profile info for the signed-in user
│   │   │   │   ├── link-canvas/
│   │   │   │   │   └── route.ts    # POST /api/auth/link-canvas — associate web app user with canvas identity
│   │   │   │   └── canvas-token/
│   │   │   │       └── route.ts    # POST /api/auth/canvas-token — store a Canvas API access token
│   │   │   ├── assignments/
│   │   │   │   ├── route.ts        # GET (list saved IDs) + POST (save assignment)
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts    # DELETE /api/assignments/:id — unsave an assignment
│   │   │   └── canvas-snapshot/
│   │   │       └── route.ts        # DEPRECATED — see Authentication section
│   │   ├── lib/
│   │   │   ├── supabaseAdmin.ts    # Supabase client initialized with the service-role key (server only)
│   │   │   └── verifyJwt.ts        # Verifies Supabase JWTs from incoming requests
│   │   ├── schemas/
│   │   │   ├── auth.ts             # Zod schemas for auth request bodies
│   │   │   ├── assignments.ts      # Zod schemas for assignment request bodies
│   │   │   └── canvas.ts           # Zod schemas for Canvas API response shapes
│   │   └── services/
│   │       ├── authService.ts      # signInExtensionUser, upsertCanvasUser, linkCanvasUser, storeCanvasToken
│   │       ├── assignmentService.ts# fetchSavedAssignments, saveAssignment, unsaveAssignment
│   │       └── canvasTokenService.ts # Helpers for storing/retrieving encrypted Canvas API tokens
│   ├── migrations/
│   │   └── schema.sql              # Full Postgres schema (run once on a fresh Supabase project)
│   ├── next.config.ts
│   └── tsconfig.json
│
├── frontend/
│   └── react-app/                  # Vite + React project — builds both the extension and the web app
│       ├── manifest.json           # Chrome Extension Manifest V3
│       ├── panel.html              # HTML shell for the extension sidebar panel
│       ├── popup.html              # HTML shell for the extension popup
│       ├── index.html              # HTML shell for the standalone web app
│       ├── vite.config.ts          # Multi-entry build: panel, popup, background, content_script, webapp
│       └── src/
│           ├── extension/          # All Chrome extension-specific code (chrome.* APIs)
│           │   ├── content_script/
│           │   │   └── content.ts  # Injected into Canvas pages; fetches Canvas data, injects panel iframe,
│           │   │                   # bridges data to localhost web app via postMessage
│           │   ├── service_worker/
│           │   │   └── background.ts # Extension background worker; owns chrome.storage.session read/write,
│           │   │                     # handles Canvas token generation via chrome.scripting.executeScript
│           │   ├── panel/          # Extension sidebar panel UI (injected into Canvas pages as an iframe)
│           │   │   ├── PanelApp.tsx
│           │   │   ├── main.tsx
│           │   │   ├── panel.css
│           │   │   └── hooks/
│           │   │       └── usePanelData.ts # Drives panel data flow: Canvas data → auth → saved IDs → state
│           │   └── popup/          # Extension popup UI (the toolbar icon click)
│           │       ├── App.tsx     # Shows account settings and AccessTokenPrompt if token not yet stored
│           │       ├── main.tsx
│           │       ├── popup.css
│           │       ├── components/
│           │       │   └── NotOnCanvas.tsx
│           │       ├── hooks/
│           │       │   └── useCanvasData.ts
│           │       └── lib/
│           │           ├── api.ts
│           │           ├── storage.ts
│           │           └── supabaseAuthClient.ts
│           ├── shared/             # Code shared between the extension and the web app
│           │   ├── components/
│           │   │   ├── Dashboard.tsx        # Shared dashboard layout: tabs, assignment groups, announcements
│           │   │   ├── AssignmentCard.tsx   # Renders a single assignment with save/unsave action
│           │   │   ├── AnnouncementCard.tsx # Renders a single Canvas announcement
│           │   │   ├── AccessTokenPrompt.tsx# Three-mode UI for Canvas token setup (password or manual token)
│           │   │   ├── AccountSettings.tsx  # Shared account settings panel (used by popup and webapp)
│           │   │   └── StatusBadge.tsx      # Due-date / status indicator chip
│           │   ├── lib/
│           │   │   ├── apiClient.ts    # Raw fetch helpers — callers supply their own token; no Chrome/Supabase deps
│           │   │   ├── extensionApi.ts # Extension-specific API wrappers (token-aware, uses supabaseExtAuth)
│           │   │   ├── supabaseExtAuth.ts # Supabase anon client for the extension (holds the session JWT)
│           │   │   └── dateUtils.ts
│           │   └── types/
│           │       └── canvas.ts       # Shared Canvas types (CanvasPlannerItem, TrackedAssignment, ConnectAppState, etc.)
│           └── webapp/             # Standalone web app (sign in with Google, view assignments)
│               ├── App.tsx         # React Router setup + OAuth callback handler
│               ├── webapp.css
│               ├── components/
│               │   └── NavBar.tsx
│               ├── lib/
│               │   ├── api.ts          # API wrappers for the web app (thin layer over shared/lib/apiClient.ts)
│               │   └── supabaseClient.ts # Supabase anon client for the web app (separate from extension client)
│               └── pages/
│                   ├── SignIn.tsx
│                   ├── Dashboard.tsx   # Receives Canvas data from extension bridge; renders shared Dashboard
│                   ├── Account.tsx
│                   ├── Home.tsx
│                   └── Shop.tsx
│
├── docs/                           # Project documentation (proposals, branching guide, risk management)
├── tests/                          # Integration / unit tests (Jest or Vitest)
├── .github/workflows/ci.yml        # CI: lint + build checks on every PR
└── README.md
```

---

## Authentication

Canvas Pet has two separate user identities that can be linked together: a **Canvas identity** (keyed to the user's Canvas account) and a **web app identity** (Google OAuth). This section explains how each is established, how they link, and how Canvas data flows in the short and long term.

### 1. Initial Canvas Sign-In — `POST /api/auth/canvas-signin`

**File:** `backend/app/api/auth/canvas-signin/route.ts`

The first time the extension panel opens on a Canvas page, it has no backend session. The content script has already fetched the user's Canvas user ID, institution URL, display name, and email from the Canvas API. The panel sends these to `POST /api/auth/canvas-signin`.

The backend derives a deterministic HMAC password from the Canvas user ID and `EXTENSION_SECRET`, then calls the Supabase Admin API to create-or-find a Supabase Auth account for that user. It returns `access_token` and `refresh_token` which the extension stores locally via `supabaseAuth.setSession()`. No password or secret is ever sent to the client — only the resulting session tokens.

After this, `POST /api/auth` is called to write (or update) the user's display name, email, and institution URL into the `canvas_users` table.

**Files involved:**
- `extension/panel/hooks/usePanelData.ts` — calls `runExtensionAuth()` which orchestrates this flow
- `shared/lib/extensionApi.ts` — `runExtensionAuth()`, `apiExtensionAuth()`
- `shared/lib/apiClient.ts` — `apiClientExtensionAuth()`
- `backend/app/services/authService.ts` — `signInExtensionUser()`, `upsertCanvasUser()`

---

### 2. Linking a Web App Account — `POST /api/auth/link-canvas`

**File:** `backend/app/api/auth/link-canvas/route.ts`

When the user clicks "Open Web App" in the extension panel, the panel opens the web app and passes the Canvas user ID and institution URL in `sessionStorage`. On the web app's Dashboard, if a `pending_canvas_link` entry exists in session storage, it calls `POST /api/auth/link-canvas` with the Google-issued JWT.

The backend writes the Google user's Supabase ID into the `web_user_id` column of the matching `canvas_users` row, and stores the Google display name and email. From this point on, `GET /api/auth/profile` can resolve either the Canvas JWT or the Google JWT to the same row, giving the web app access to all saved assignments without re-entering any credentials.

**Files involved:**
- `webapp/pages/Dashboard.tsx` — reads `pending_canvas_link` from sessionStorage and calls `apiLinkCanvas()`
- `webapp/lib/api.ts` — `apiLinkCanvas()`
- `backend/app/services/authService.ts` — `linkCanvasUser()`

---

### 3. Pulling Assignment Data — Short-Term via Chrome Session State

**Files:** `extension/content_script/content.ts`, `extension/service_worker/background.ts`

Canvas data (assignments and announcements) is fetched by the content script on every Canvas page load using the browser's own session cookies — no Canvas API token is required. The content script sends the data to the background service worker, which writes it to `chrome.storage.session` (an in-memory store cleared when the browser closes).

The panel reads from this cache via postMessage to the background worker. On localhost, the content script skips panel injection entirely and instead bridges the cached data to the web app via `window.postMessage` (`CP_CANVAS_DATA`). The web app's Dashboard listens for this message and renders the data natively — no backend round-trip, no token required.

This is the **primary data path** and works as long as the user has a Canvas tab open in the same browser session.

**Files involved:**
- `extension/content_script/content.ts` — `fetchCanvasData()`, `initBridge()`, `SAVE_CANVAS_CACHE` message
- `extension/service_worker/background.ts` — `GET_CANVAS_CACHE` / `SAVE_CANVAS_CACHE` handlers
- `webapp/pages/Dashboard.tsx` — `CP_CANVAS_DATA` listener, `CP_REQUEST_DATA` sender

---

### 4. Long-Term Access — Canvas Access Token

**File:** `backend/app/api/auth/canvas-token/route.ts`

For server-side Canvas access (background sync, notifications, features that work without the browser extension running), the backend needs a Canvas personal access token. The extension can generate one by injecting a script into the Canvas page via `chrome.scripting.executeScript` with `world: 'MAIN'`, which performs a same-origin POST to Canvas's `/api/v1/users/self/tokens` endpoint from inside the real page context (bypassing Chrome's CSRF and CSP restrictions on content scripts).

Once generated, the token is stored in the backend's database via `POST /api/auth/canvas-token`. The `AccessTokenPrompt` component handles the user-facing flow: it offers either automatic generation (requires the user's Canvas password) or manual paste. `GET /api/auth/profile` returns `canvas_token_stored: true` once the token is saved, which the popup uses to decide whether to show the prompt.

**Files involved:**
- `extension/service_worker/background.ts` — `GENERATE_CANVAS_TOKEN` handler, `generateCanvasTokenInPage()`
- `extension/content_script/content.ts` — forwards `GENERATE_CANVAS_TOKEN` from panel to background
- `shared/components/AccessTokenPrompt.tsx` — UI for password-based or manual token entry
- `extension/popup/App.tsx` — shows `AccessTokenPrompt` when `canvas_token_stored` is false
- `shared/lib/apiClient.ts` — `apiClientStoreCanvasToken()`
- `backend/app/services/canvasTokenService.ts` — token storage/retrieval helpers

---

### 5. Deprecated: Backend Snapshot Relay

**File:** `backend/app/api/canvas-snapshot/route.ts` *(commented out)*

An earlier approach had the extension panel POST the fetched Canvas data to the backend, which held it in memory for the web app to GET on load. This was replaced by the Chrome session state bridge (section 3) after the GET endpoint caused errors due to a race condition on initial setup. The route file is preserved with comments explaining the design; see the file for details on re-enabling it.

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

A Next.js project used exclusively as an HTTP API — no pages, no SSR. Every route lives under `app/api/`. Business logic sits in `app/services/`, keeping route handlers thin. `app/lib/` and `app/schemas/` are shared utilities available to all routes. The Supabase Admin SDK (initialized with the service-role key) is only ever used server-side, which lets the backend bypass Row Level Security for trusted writes while still enforcing RLS for all client-initiated reads.

### Frontend — Extension (`frontend/react-app/src/extension/`)

All code that depends on `chrome.*` APIs lives here. The **content script** runs on every Canvas page: it fetches Canvas data using the browser session, caches it through the background worker, injects the sidebar panel iframe, and on localhost bridges data to the web app via `window.postMessage`. The **background service worker** is the sole owner of `chrome.storage.session` — content scripts on HTTP origins cannot access it directly, so all reads and writes are routed through the worker via message passing. The **panel** is a full React app rendered inside an iframe injected into Canvas pages. The **popup** (toolbar icon) shows account settings and the Canvas token setup prompt.

### Frontend — Web App (`frontend/react-app/src/webapp/`)

A small React Router app built from the same Vite config (separate entry point: `index.html` → `webapp.js`). Users sign in with Google; Supabase handles the OAuth flow and redirects back to `/auth/callback`. The Dashboard page receives Canvas data from the extension bridge and renders it using the shared `Dashboard` component. If no extension data is present (different browser, different machine), it prompts the user to open Canvas in another tab.

### Frontend — Shared (`frontend/react-app/src/shared/`)

Components and API helpers that have no dependency on Chrome APIs. `apiClient.ts` is pure `fetch` — callers from both the extension and the web app pass their own token in. The shared `Dashboard` component is used by both the panel and the webapp; panel-specific controls (fullscreen, minimize, Open Web App button) are passed in as optional props and simply omitted by the web app.

### Database (`backend/migrations/schema.sql`)

Two tables:

- **`canvas_users`** — one row per Canvas identity. Stores `canvas_user_id`, `institution_url`, `display_name`, `email`, optional `web_user_id` (the linked Google account), and `canvas_token` for long-term API access. The primary key is a UUID matching the Supabase Auth `uid`.
- **`saved_assignments`** — one row per pinned assignment, with a foreign key to `canvas_users.canvas_user_id`. A unique constraint prevents duplicate saves. RLS policies ensure users can only read and write their own rows.

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
