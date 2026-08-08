# Pathwise

AI-powered learning and career roadmap platform.

## Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: Supabase (Postgres, already set up — no schema files needed here)
- AI: Groq API

## Local setup

**Backend**
```bash
cd backend
npm install
cp .env.example .env   # fill in your real values
npm start
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env   # fill in your real values
npm run dev
```

## Environment variables

**backend/.env**
- `PORT` — server port (default 5000)
- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_ANON_KEY` — your Supabase anon/public key
- `AI_API_KEY` — your Groq API key
- `FRONTEND_URL` — your deployed frontend URL (used for CORS)

**frontend/.env**
- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — your Supabase anon/public key
- `VITE_API_URL` — your deployed backend URL

## Deployment

1. Push this project to a GitHub repo (`.env` files are gitignored, so secrets never get committed)
2. Deploy `backend/` to Railway (or similar) — set the env vars above in the platform's dashboard
3. Deploy `frontend/` to Vercel/Netlify — set the env vars above in the platform's dashboard, `npm run build` as the build command
4. Once both are live, update `FRONTEND_URL` on the backend to the real deployed frontend URL, and `VITE_API_URL` on the frontend to the real deployed backend URL
5. Redeploy both after updating those two values

## Database
Schema and RLS policies are already applied directly in the Supabase project (SQL Editor) — not included in this package. No migration files to run.
