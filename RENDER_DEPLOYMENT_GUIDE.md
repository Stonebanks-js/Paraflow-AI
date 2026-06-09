# Render Deployment Guide

This guide covers deploying Paraflow AI to Render.com.

## Architecture

- **Backend**: FastAPI on Render (Python)
- **Frontend**: Next.js on Vercel or Render (Node.js)
- **Database**: Supabase (managed PostgreSQL)
- **Auth**: Supabase Auth (or demo mode)

---

## Backend Deployment

### 1. Create Render Account

Go to [render.com](https://render.com) and sign up.

### 2. Create a New Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `paraflow-ai-backend` |
| **Region** | Choose closest to you |
| **Branch** | `main` |
| **Root Directory** | `backend` |

### 3. Configure Build Command

```bash
pip install -r requirements.txt
```

### 4. Configure Start Command

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### 5. Add Environment Variables

Go to **Environment** section and add:

#### Required Variables

```env
# Application
APP_NAME=Paraflow AI
DEBUG=false
DEMO_MODE=false

# Supabase (for production auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Authentication (generate a strong random string)
JWT_SECRET_KEY=your-super-secret-random-string-min-32-chars

# AI Provider (at least one needed for real AI)
ANTHROPIC_API_KEY=your-anthropic-key
# OR
NVIDIA_API_KEY=your-nvidia-key

# CORS (your frontend URL)
CORS_ORIGINS=https://your-frontend.onrender.com,http://localhost:3000
```

#### Optional Variables

```env
# NVIDIA (if using)
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=nvidia/llama-3.1-nemotron-nano-8b-v1

# AI Models (defaults set)
AI_MODEL_HAIKU=claude-3-haiku-20240307
AI_MODEL_SONNET=claude-3-5-sonnet-20241022
AI_MODEL_GEMINI_FLASH=gemini-2.0-flash
AI_MODEL_GEMINI_PRO=gemini-1.5-pro

# Rate Limiting
RATE_LIMIT_FREE=10
RATE_LIMIT_PRO=60
RATE_LIMIT_TEAM=120
```

### 6. Deploy

Click **"Create Web Service"** to start deployment.

### 7. Verify Backend

After deployment, verify the health endpoint:

```bash
curl https://your-backend.onrender.com/api/health
```

Expected response:
```json
{"status": "healthy", "version": "1.0.0", "service": "Paraflow AI"}
```

---

## Frontend Deployment (Vercel - Recommended)

### 1. Create Vercel Account

Go to [vercel.com](https://vercel.com) and sign up.

### 2. Import Project

1. Click **"Add New..."** → **"Project"**
2. Import your GitHub repository
3. Vercel will auto-detect Next.js

### 3. Configure Environment Variables

In **Environment Variables** section:

```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Configure Build Command

```bash
npm install && npm run build
```

### 5. Deploy

Click **"Deploy"**.

---

## Frontend Deployment (Render)

Alternatively, deploy frontend to Render as a Static Site.

### 1. Create Render Account

Go to [render.com](https://render.com) and sign up.

### 2. Create a New Static Site

1. Click **"New +"** → **"Static Site"**
2. Connect your GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `paraflow-ai-frontend` |
| **Region** | Choose closest to you |
| **Branch** | `main` |
| **Root Directory** | `frontend` |

### 3. Configure Build Command

```bash
npm install && npm run build
```

### 4. Configure Output Directory

```
.next
```

### 5. Add Environment Variables

```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 6. Deploy

Click **"Create Static Site"**.

---

## Deployment Order

1. **Deploy Backend First**
   - Note the backend URL (e.g., `https://paraflow-ai-backend.onrender.com`)
   - Verify health endpoint works

2. **Deploy Frontend Second**
   - Use backend URL in `NEXT_PUBLIC_API_URL`
   - Verify frontend builds successfully

3. **Update CORS Origins**
   - After frontend is deployed, update backend's `CORS_ORIGINS` to include the frontend URL

4. **Test Authentication**
   - Register a new user or login
   - Test AI tools (Paraphraser, Humanizer, etc.)

---

## Testing Checklist

### Backend Tests

- [ ] Health endpoint: `GET /api/health`
- [ ] Register: `POST /api/v1/auth/register`
- [ ] Login: `POST /api/v1/auth/login`
- [ ] Paraphraser: `POST /api/v1/tools/paraphrase` (with auth token)
- [ ] All other AI tools work

### Frontend Tests

- [ ] Home page loads
- [ ] Login works
- [ ] Dashboard loads
- [ ] Paraphraser tool works
- [ ] All other tools work
- [ ] No console errors

---

## Troubleshooting

### Backend Issues

**Health endpoint returns 404**
- Check if the server started correctly
- Verify the route prefix is correct (`/api`)

**Authentication fails**
- Verify `JWT_SECRET_KEY` is set
- Check Supabase credentials are correct
- Ensure `DEMO_MODE=false` for production

**AI tools return errors**
- Verify API keys are set (`ANTHROPIC_API_KEY` or `NVIDIA_API_KEY`)
- Check backend logs for detailed errors

### Frontend Issues

**API calls fail**
- Verify `NEXT_PUBLIC_API_URL` points to correct backend URL
- Check browser console for CORS errors
- Ensure backend CORS_ORIGINS includes frontend URL

**Build fails**
- Check Node.js version (18+ required)
- Verify all environment variables are set
- Check build logs for missing dependencies

---

## Demo Mode

For testing without setting up Supabase/NVIDIA:

1. Set `DEMO_MODE=true` in backend environment
2. Register a new user via the frontend
3. All AI tools will use simulation fallback

Demo mode features:
- Auth works with in-memory users
- All AI engines return simulated responses
- Credits system works with demo balance

---

## Environment Variables Reference

### Backend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_NAME` | No | Paraflow AI | Application name |
| `DEBUG` | No | false | Enable debug mode |
| `DEMO_MODE` | No | true | Run in demo mode |
| `SUPABASE_URL` | For production | - | Supabase project URL |
| `SUPABASE_KEY` | For production | - | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | For production | - | Supabase service role key |
| `JWT_SECRET_KEY` | For production | - | JWT signing secret |
| `ANTHROPIC_API_KEY` | For AI | - | Anthropic API key |
| `NVIDIA_API_KEY` | For AI | - | NVIDIA API key |
| `CORS_ORIGINS` | Yes | localhost | Comma-separated allowed origins |
| `PORT` | Auto | 8000 | Server port (set by Render) |

### Frontend (.env.local)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | http://localhost:8000/api | Backend API URL |
| `NEXT_PUBLIC_SUPABASE_URL` | For auth | - | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For auth | - | Supabase anon key |

---

## Support

For issues:
1. Check backend logs in Render dashboard
2. Verify environment variables
3. Test endpoints with curl
4. Check Supabase dashboard for auth issues