# Paraflow AI - Writing Intelligence Platform

## Project Structure
```
paraflow-ai/
├── frontend/          # Next.js 15 application
├── backend/           # FastAPI Python application
├── packages/          # Shared packages (types, utils)
└── docs/             # Documentation
```

## Tech Stack

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript 5.5+
- Tailwind CSS 4
- shadcn/ui
- Zustand (state management)
- TanStack Query (server state)

### Backend
- FastAPI
- Python 3.12
- SQLAlchemy 2.0 (async)
- Pydantic 2
- Celery 5.4
- pgvector

## Getting Started

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```