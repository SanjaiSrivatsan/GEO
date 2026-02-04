# Quick Setup Guide

Follow these steps after cloning the repository.

## 1. Configure Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and add your credentials:

```env
# Generate new JWT secret key:
python -c "import secrets; print(secrets.token_urlsafe(32))"
# Add the output as SECRET_KEY

# Add your OpenAI API key (get from platform.openai.com)
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Update database password if different
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/geo_db
```

## 2. Setup Database

```bash
# Create PostgreSQL database
createdb geo_db

# Or using psql:
psql -U postgres
CREATE DATABASE geo_db;
\q

# Run migrations
alembic upgrade head
```

## 3. Install & Run

**Backend:**

```bash
cd backend
python -m venv venv
venv\Scripts\Activate.ps1  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**

```bash
cd GEO
npm install
npm run dev
```

## 4. Access Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 5. First Time Login

1. Register a new account
2. Create business profile
3. Click "Run GEO Analysis"
4. Click "Recompute Score"
5. View your GEO dashboard!

---

**Need help?** Check the full [README.md](README.md) for detailed documentation.
