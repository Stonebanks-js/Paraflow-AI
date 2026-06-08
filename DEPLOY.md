# Deploy to Railway

## Prerequisites
- Railway account (railway.app)
- GitHub account with the project pushed to a repo

## Step 1: Push Project to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/Paraflow-AI.git
git push -u origin main
```

## Step 2: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `Paraflow-AI` repository
4. Railway will auto-detect Python/FastAPI
5. Add environment variables in Railway dashboard:
   - `SUPABASE_URL` = `https://txpatnmsigkmmgrbhbel.supabase.co`
   - `SUPABASE_KEY` = your Supabase anon key
   - `SUPABASE_SERVICE_KEY` = your Supabase service role key
   - `OPENROUTER_API_KEY` = your OpenRouter API key
   - `JWT_SECRET_KEY` = generate a strong random string
   - `CORS_ORIGINS` = your Netlify/Vercel frontend URL (e.g., `https://paraflow-ai.netlify.app`)
   - `ENVIRONMENT` = `production`
   - `DEBUG` = `false`

6. Railway will auto-detect and use the `Dockerfile` in project root

7. After deployment, note your backend URL (e.g., `https://paraflow-ai-backend.up.railway.app`)

## Step 3: Deploy Frontend to Vercel (Recommended for Next.js)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project" → Import your GitHub repo
3. Vercel will auto-detect Next.js
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL` = your Railway backend URL (e.g., `https://paraflow-ai-backend.up.railway.app/api`)
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://txpatnmsigkmmgrbhbel.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key

5. Deploy!

## Alternative: Deploy Frontend to Netlify

1. Build locally: `cd frontend && npm run build`
2. Drag the `frontend/.next` folder to Netlify
3. Or connect via GitHub and set build command to `npm run build`

## Step 4: Update CORS Origins

After getting your frontend URL (Netlify/Vercel), update the Railway environment variable:
- `CORS_ORIGINS` = `https://your-frontend-url.netlify.app,https://your-frontend-url.vercel.app`

## Files Created for Deployment

- `Dockerfile` - Backend container
- `railway.toml` - Railway configuration
- `railway.json` - Railway deployment config
- `.env.production` - Environment variable template
- `frontend/next.config.ts` - Updated for production API URL

## Notes

- The backend uses PORT environment variable (set by Railway)
- CORS is configured to accept requests from allowed origins
- Supabase handles auth - no database deployment needed
- Redis/Celery are optional (used for background jobs)