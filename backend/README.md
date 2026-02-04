# GEO Backend API

Clean, professional FastAPI backend for the GEO platform.

## Tech Stack

- **Framework:** FastAPI 0.109.0
- **Database:** PostgreSQL with SQLAlchemy ORM
- **Authentication:** JWT with python-jose
- **Task Queue:** Celery + Redis
- **AI/NLP:** LangChain (limited use for GEO prompts & chatbot only)
- **External APIs:** Google Business Profile, Reddit, Justdial

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Configuration & environment variables
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes/          # API route handlers
│   │       ├── __init__.py
│   │       └── health.py    # Health check endpoints
│   ├── core/
│   │   ├── __init__.py
│   │   └── database.py      # Database connection & session
│   ├── models/              # SQLAlchemy models
│   │   └── __init__.py
│   ├── schemas/             # Pydantic schemas (request/response)
│   │   └── __init__.py
│   ├── services/            # Business logic & external integrations
│   │   └── __init__.py
│   └── utils/               # Utility functions
│       └── __init__.py
├── logs/                    # Application logs
├── .env                     # Environment variables (not in git)
├── .env.example             # Example environment variables
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Setup Instructions (Windows)

### 1. Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis (optional, for background jobs)

### 2. Create Virtual Environment

```powershell
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1
```

### 3. Install Dependencies

```powershell
pip install -r requirements.txt
```

### 4. Setup PostgreSQL Database

```powershell
# Install PostgreSQL from https://www.postgresql.org/download/windows/
# Or use Docker:
docker run --name geo-postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15

# Create database
psql -U postgres
CREATE DATABASE geo_db;
\q
```

### 5. Configure Environment Variables

```powershell
# Copy example env file
Copy-Item .env.example .env

# Edit .env with your configuration
notepad .env
```

**Required variables:**

- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret key (generate with `openssl rand -hex 32`)

### 6. Run Database Migrations

```powershell
# TODO: Setup Alembic migrations
# alembic upgrade head
```

### 7. Run Development Server

```powershell
# Using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using Python
python -m app.main
```

### 8. Access API Documentation

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/api/health

## API Endpoints

### Health & Status

- `GET /` - Root endpoint with API info
- `GET /api/health` - Full health check with metadata
- `GET /api/health/ping` - Simple ping/pong

### Authentication (TODO)

- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/google-oauth` - Google OAuth authentication
- `POST /api/auth/logout` - User logout

### Business Profile (TODO)

- `POST /api/business/profile` - Create business profile
- `GET /api/business/profile` - Get business profile
- `PUT /api/business/profile` - Update business profile

### Google Business (TODO)

- `POST /api/google/oauth/connect` - Initiate Google OAuth
- `GET /api/google/oauth/callback` - OAuth callback handler
- `GET /api/google/locations` - Get connected locations
- `POST /api/google/sync` - Sync selected locations
- `POST /api/google/disconnect` - Disconnect Google account

### Dashboard (TODO)

- All dashboard endpoints as per specification

## Development Guidelines

### LangChain Usage Rules

**ALLOWED:**

- GEO prompt execution (`/api/geo/prompt-execution`)
- GEO chatbot (`/api/geo/chatbot`)
- Sentiment analysis
- Keyword extraction
- Auto-reply generation

**NOT ALLOWED:**

- Website crawling (use custom crawler)
- Google API calls (use google-api-python-client)
- Database operations (use SQLAlchemy)
- Orchestration (use native Python async)

### Code Standards

- Follow PEP 8 style guide
- Use type hints for all functions
- Add docstrings to all public functions
- Log important operations with loguru
- Handle errors gracefully with try/except
- Return proper HTTP status codes

## Testing

```powershell
# Run tests
pytest

# Run with coverage
pytest --cov=app tests/
```

## Production Deployment

1. Set `DEBUG=False` in .env
2. Generate strong `SECRET_KEY`
3. Configure proper CORS origins
4. Use production PostgreSQL instance
5. Setup Redis for Celery
6. Use production WSGI server (e.g., gunicorn with uvicorn workers)
7. Setup reverse proxy (nginx)
8. Enable HTTPS
9. Configure logging to external service

## License

Proprietary - All rights reserved
