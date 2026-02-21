# Lead System

AI Agent / Automation lead intake: Node.js + Express backend, PostgreSQL (Supabase), modular agents (intake → qualification → dispatch), retry logic, structured logging, and a Next.js admin dashboard.

---

## Project structure

```
lead-system/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/
│   │   │   └── lead.routes.js
│   │   ├── agents/
│   │   │   ├── intake.agent.js
│   │   │   ├── qualification.agent.js
│   │   │   └── dispatch.agent.js
│   │   ├── services/
│   │   │   ├── db.service.js
│   │   │   └── logger.service.js
│   │   ├── utils/
│   │   │   └── retry.util.js
│   │   └── middleware/
│   │       └── error.middleware.js
│   ├── package.json
│   └── .env
├── dashboard/
│   ├── app/
│   │   ├── layout.js
│   │   └── page.js
│   ├── lib/
│   │   └── supabase.js
│   ├── next.config.js
│   ├── jsconfig.json
│   ├── package.json
│   └── .env
├── database.sql
└── README.md
```

Backend and dashboard each have their own `package.json` and `node_modules`. There is no root-level package.

---

## Tech stack

| Part       | Stack |
|-----------|--------|
| Backend   | Node.js 18+, Express, pg (PostgreSQL), cors, dotenv |
| Database  | PostgreSQL (Supabase); schema in `database.sql` |
| Dashboard | Next.js 14 (App Router), React 18, @supabase/supabase-js |

---

## Prerequisites

- Node.js 18+
- A Supabase project (for PostgreSQL and dashboard API keys)

---

## 1. Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the full contents of `database.sql` in the project root. This creates:
   - Table `leads` (id, name, email, message, source, priority, status, api_response_code, retry_count, created_at, updated_at)
   - Indexes on `status` and `created_at`
   - Trigger to keep `updated_at` in sync
3. In **Project Settings → API**: copy **Project URL** and **anon public** key (for the dashboard).
4. In **Project Settings → Database**: copy the **Connection string (URI)** and replace the password placeholder (for the backend).

---

## 2. Backend setup

1. Go to the backend folder:
   ```bash
   cd backend
   ```
2. Create a `.env` file with:
   ```env
   PORT=3001
   DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
   ```
   Use the Supabase connection string from step 1. For Supabase pooler, the host is like `aws-0-<region>.pooler.supabase.com` and the user is `postgres.<project-ref>`.
3. Install and run:
   ```bash
   npm install
   npm run dev
   ```
   Default URL: `http://localhost:3001`.

**Scripts**

- `npm run dev` – run with `--watch` (restart on file change)
- `npm start` – run for production (`node src/server.js`)

**Endpoints**

- `GET /health` – health check
- `POST /api/lead` – submit a lead (body format below)

---

## 3. Dashboard setup

1. Go to the dashboard folder:
   ```bash
   cd dashboard
   ```
2. Create `.env.local` (or `.env`) with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
   Use the Project URL and anon key from Supabase (step 1).
3. Install and run:
   ```bash
   npm install
   npm run dev
   ```
   Default URL: `http://localhost:3000`.

**Scripts**

- `npm run dev` – development server
- `npm run build` – production build
- `npm start` – run production build

The dashboard reads from the `leads` table via the Supabase client and shows: name, email, priority, status, api_response_code, retry_count, created_at.

---

## API: POST /api/lead

**Content-Type:** `application/json`

**Body (only these four string fields):**

```json
{
  "name": "John Doe",
  "email": "john@email.com",
  "message": "I need urgent help immediately",
  "source": "facebook"
}
```

**Rules**

- `source` must be one of: `facebook`, `google`, `website`
- `email` must match a valid email regex
- `message` must be at least 15 characters
- No extra fields; only `name`, `email`, `message`, `source` are accepted

**Responses**

- **400** – Invalid body or validation failed (lead is still stored with `status = "validation_failed"`)
- **201** – Lead accepted and pipeline completed (`status = "completed"`)
- **502** – Lead stored and qualified but dispatch to the external API failed after retries (`status = "api_failed"`)

---

## Agent pipeline

1. **Intake** (`intake.agent.js`)  
   Validates email, message length (≥ 15), and source. Inserts the row with `status = "received"` or `"validation_failed"`. On validation failure the API returns 400.

2. **Qualification** (`qualification.agent.js`)  
   If the message contains “urgent” or “immediately”, sets `priority = "high"`, else `"normal"`. Sets `status = "qualified"`.

3. **Dispatch** (`dispatch.agent.js`)  
   POSTs to `https://jsonplaceholder.typicode.com/posts` with `{ "lead_email", "priority" }`. Uses a retry helper (max 2 retries, 1s delay). On success: `status = "completed"`, stores HTTP status and retry count. On failure: `status = "api_failed"`.

Retry logic lives in `utils/retry.util.js`. Logging is structured JSON to stdout in `services/logger.service.js`. Errors are handled in `middleware/error.middleware.js`.

---

## Deployment

**Backend (e.g. Render)**

- Build: `cd backend && npm install`
- Start: `cd backend && npm start`
- Env: `PORT` (optional, Render sets it), `DATABASE_URL` (Supabase connection string)

**Dashboard (e.g. Vercel)**

- Root directory: `dashboard`
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Build/start: default Next.js (`npm run build`, `npm start`)

Replace with your own URLs where needed:

- Public API URL: `https://your-backend.onrender.com`
- Public dashboard URL: `https://your-dashboard.vercel.app`

---

## n8n equivalent

The same flow can be built in [n8n](https://n8n.io):

1. **Webhook** for `POST /api/lead` with body `name`, `email`, `message`, `source`.
2. **Validation** (Code/IF): email regex, message length ≥ 15, source in [facebook, google, website]. **Supabase/Postgres**: insert into `leads` with `status = "validation_failed"` or `"received"`. If validation failed, return 400 and stop.
3. **Qualification**: set `priority` from “urgent”/“immediately”, update `status = "qualified"`.
4. **Dispatch**: **HTTP Request** POST to `https://jsonplaceholder.typicode.com/posts` with retries (e.g. 3 attempts, 1s delay). On success update `status = "completed"` and store response code; on failure update `status = "api_failed"` and `retry_count`.
5. **Respond to Webhook** with 201 or 502.

---

## License

MIT.
