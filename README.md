# Lead System – AI Agent / Automation Intern Technical Assessment

Production-ready full-stack lead intake system: Node.js/Express backend, PostgreSQL (Supabase), modular agents (intake → qualification → dispatch), retry logic, structured logging, and a Next.js admin dashboard.

---

## Project structure

```
root/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/lead.routes.js
│   │   ├── agents/
│   │   │   ├── intake.agent.js
│   │   │   ├── qualification.agent.js
│   │   │   └── dispatch.agent.js
│   │   ├── services/
│   │   │   ├── db.service.js
│   │   │   └── logger.service.js
│   │   ├── utils/retry.util.js
│   │   └── middleware/error.middleware.js
│   ├── package.json
│   └── .env.example
├── dashboard/          # Next.js admin app
├── database.sql
└── README.md
```

---

## Setup instructions

### 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the contents of `database.sql` to create the `leads` table (and optional index/trigger).
3. In **Project Settings → API** copy:
   - **Project URL** → use as `NEXT_PUBLIC_SUPABASE_URL` for the dashboard and as the host in `DATABASE_URL` for the backend.
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the dashboard.
4. In **Project Settings → Database** get the connection string (URI) for the backend. Use **Connection string → URI** and replace the password placeholder. That URI is your `DATABASE_URL`.

### 2. Backend (Node.js + Express)

```bash
cd backend
cp .env.example .env
# Edit .env: set PORT and DATABASE_URL (Supabase connection string)
npm install
npm run dev
```

- API base: `http://localhost:3001` (or the `PORT` you set).
- Health: `GET http://localhost:3001/health`
- Submit lead: `POST http://localhost:3001/api/lead` with JSON body (see below).

### 3. Dashboard (Next.js)

```bash
cd dashboard
cp .env.example .env.local
# Edit .env.local: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

- Open `http://localhost:3000`. The table shows leads from the database (name, email, priority, status, api_response_code, retry_count, created_at).

---

## API – POST /api/lead

**Accepted JSON only:**

```json
{
  "name": "John Doe",
  "email": "john@email.com",
  "message": "I need urgent help immediately",
  "source": "facebook"
}
```

- **source** must be one of: `facebook`, `google`, `website`.
- **email** must be valid (regex).
- **message** must be at least 15 characters.

Extra fields or wrong types are rejected. On validation failure the lead is still inserted with `status = "validation_failed"` and the API returns `400`. On success the pipeline runs (intake → qualification → dispatch) and returns `201` with `leadId` and `status: "completed"` (or `502` if dispatch fails after retries).

---

## How to run the backend locally

1. Install Node.js 18+.
2. Create `.env` in `backend/` from `.env.example` and set:
   - `PORT` (e.g. `3001`)
   - `DATABASE_URL` (Supabase PostgreSQL connection string)
3. Run:

   ```bash
   cd backend
   npm install
   npm run dev
   ```

   For production run: `npm start`.

---

## Deploy backend to Render

1. Create a **Web Service** and connect your repo (or push this project to GitHub).
2. **Root directory**: leave empty or set to repo root.
3. **Build command**: `cd backend && npm install`
4. **Start command**: `cd backend && npm start`
5. **Environment**: add `PORT` (Render sets this automatically; you can leave it) and `DATABASE_URL` (Supabase connection string from Supabase dashboard).
6. Deploy. After deploy, your API base URL will be like: `https://<your-service-name>.onrender.com`

**Public API URL placeholder:** `https://your-backend.onrender.com`

---

## Deploy dashboard to Vercel

1. Push the project to GitHub (or use Vercel’s CLI with the repo).
2. In Vercel, **Import** the repo.
3. Set **Root Directory** to `dashboard`.
4. **Environment variables** (for Production/Preview):
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL  
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key  
5. Deploy. The dashboard URL will be like: `https://your-dashboard.vercel.app`

**Public dashboard URL placeholder:** `https://your-dashboard.vercel.app`

---

## Agent flow (summary)

1. **Intake agent**  
   Validates email (regex), message length (≥ 15), and source (facebook | google | website). Inserts the lead with `status = "validation_failed"` or `"received"`. Returns 400 if validation failed.

2. **Qualification agent**  
   If message contains “urgent” or “immediately” → `priority = "high"`, else `"normal"`. Sets `status = "qualified"`.

3. **Dispatch agent**  
   POSTs to `https://jsonplaceholder.typicode.com/posts` with `{ "lead_email", "priority" }`. Uses a reusable retry utility (max 2 retries, 1s delay). On success: `status = "completed"`, stores API response status code and retry count. On failure after retries: `status = "api_failed"`.

---

## How this could be implemented using n8n

The same pipeline can be modeled in [n8n](https://n8n.io) as a workflow:

1. **Trigger**  
   Webhook node for `POST /api/lead` (or an equivalent path). Body schema: `name`, `email`, `message`, `source`.

2. **Intake / validation**  
   - **Code** or **IF** nodes: validate email (regex), message length ≥ 15, source in [facebook, google, website].  
   - **Supabase** (or **Postgres**) node: insert into `leads` with `status = "validation_failed"` or `"received"`.  
   - **IF** on validation result: if failed, respond with 400 and stop; otherwise continue.

3. **Qualification**  
   - **Code** or **IF**: check if `message` contains “urgent” or “immediately” → set `priority = "high"`, else `"normal"`.  
   - **Supabase/Postgres**: update lead with `priority` and `status = "qualified"`.

4. **Dispatch with retry**  
   - **HTTP Request** node: POST to `https://jsonplaceholder.typicode.com/posts` with `lead_email` and `priority`.  
   - Use n8n’s **Error Trigger** or a **Loop** (e.g. 3 attempts with 1s delay) to implement retries.  
   - On success: **Supabase/Postgres** update lead to `status = "completed"`, store response status code and retry count.  
   - On final failure: update to `status = "api_failed"` and set `retry_count`.

5. **Response**  
   **Respond to Webhook** with 201 (and lead id) or 502 if dispatch failed.

n8n gives a visual flow, built-in retries/error handling, and easy Supabase/Postgres integration; the backend implements the same logic in code for version control and deployment (e.g. Render).

---

## License

MIT.
