# GEO Engine - Generative Engine Optimization Platform

AI-powered business visibility scoring system that analyzes how well your business appears in AI-generated search results and recommendations.

## 🚀 Features 

- **GEO Score Calculation** - Deterministic scoring based on 4 dimensions:
  - Presence Score (35%) - Brand mentions, citations, directory listings
  - Accuracy Score (35%) - NAP consistency, information accuracy
  - Trust Score (20%) - Reviews, sentiment, trust signals
  - Hallucination Penalty (-10 to 0) - Uncited claims, contradictions

- **AI Prompt Execution** - 22 AI prompts across 5 categories using OpenAI GPT-4
- **Multi-Source Data Collection** - Website crawling, Google Business integration, brand mentions
- **Real-time Dashboard** - Visualize scores, breakdowns, evidence, and prompt results
- **RESTful API** - Complete FastAPI backend with JWT authentication

## 📁 Project Structure

```
GEO/
├── backend/          # FastAPI + PostgreSQL backend
│   ├── app/
│   │   ├── api/     # API routes
│   │   ├── models/  # SQLAlchemy models
│   │   ├── services/# Business logic
│   │   └── core/    # Config, database, auth
│   ├── alembic/     # Database migrations
│   └── requirements.txt
│
└── GEO/             # React + TypeScript frontend
    ├── src/
    │   ├── pages/   # Page components
    │   └── utils/   # API utilities
    └── package.json
```

## 🛠️ Tech Stack

**Backend:**

- FastAPI (Python 3.11+)
- PostgreSQL + SQLAlchemy
- OpenAI GPT-4 + LangChain
- JWT Authentication (bcrypt)
- Alembic (migrations)

**Frontend:**

- React 19 + TypeScript
- Vite build tool
- Tailwind CSS
- Lucide icons

## 📋 Prerequisites

- Python 3.11 or higher
- PostgreSQL 14 or higher
- Node.js 18 or higher
- OpenAI API key

## ⚙️ Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd FINAL\ GEO\ IMPLEMENTATION
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\Activate.ps1
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your credentials:
# - DATABASE_URL (PostgreSQL connection string)
# - SECRET_KEY (generate with: python -c "import secrets; print(secrets.token_urlsafe(32))")
# - OPENAI_API_KEY (from OpenAI platform)

# Run database migrations
alembic upgrade head

# Start backend server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will run at: **http://localhost:8000**  
API Docs: **http://localhost:8000/docs**

### 3. Frontend Setup

```bash
cd GEO

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run at: **http://localhost:5173**

## 🔑 Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/geo_db

# JWT Authentication
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# OpenAI
OPENAI_API_KEY=sk-proj-your-api-key-here

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

See `.env.example` for all available options.

## 📊 Database Schema

**11 Core Tables:**

- users
- business_profiles
- website_content
- google_reviews
- brand_mentions
- geo_prompts (22 pre-defined prompts)
- geo_prompt_results
- geo_scores
- google_locations
- google_oauth_tokens
- crawl_jobs

## 🎯 Usage

### 1. Create Account & Login

- Register at http://localhost:5173
- Login with email/password

### 2. Setup Business Profile

- Enter business details (name, category, location, website)
- Define brand voice and GEO goals

### 3. Run GEO Analysis

- Click "Run GEO Analysis" to execute 22 AI prompts
- Wait for completion (~60-90 seconds)

### 4. Compute Score

- Click "Recompute Score" to calculate GEO score
- View breakdown by dimension

### 5. View Dashboard

- Explore score overview, breakdowns, evidence panels
- Review prompt results grouped by category

## 📡 API Endpoints

### Authentication

- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login (returns JWT)
- `GET /api/auth/me` - Get current user

### Business Profiles

- `POST /api/business/profiles` - Create business profile
- `GET /api/business/profiles/current` - Get current profile

### GEO Prompts

- `POST /api/geo/prompts/run` - Execute 22 AI prompts
- `GET /api/geo/prompts/results/{entity_id}` - Get prompt results
- `GET /api/geo/prompts/library` - List all prompts

### GEO Scoring

- `POST /api/geo/score/compute` - Calculate GEO score
- `GET /api/geo/score/{entity_id}` - Get score
- `GET /api/geo/score/breakdown/{entity_id}` - Get detailed breakdown

### Data Collection

- `POST /api/crawl/start` - Start website crawl
- `GET /api/crawl/status/{job_id}` - Check crawl status
- `POST /api/google/sync-reviews` - Sync Google reviews
- `POST /api/mentions/discover` - Discover brand mentions

## 🧪 Testing

### Backend API Testing

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Create business profile (use token from login)
curl -X POST http://localhost:8000/api/business/profiles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "KFC", "category": "Fast Food Restaurant", "primary_location": "Mumbai, India"}'
```

## 🔒 Security

- **JWT Authentication** - All endpoints (except auth) require valid token
- **Password Hashing** - bcrypt with 12 rounds
- **CORS Protection** - Whitelist origins only
- **SQL Injection** - SQLAlchemy ORM with parameterized queries
- **Environment Variables** - No secrets in code

## 🐛 Common Issues

**Database Connection Error:**

```bash
# Ensure PostgreSQL is running
# Windows: services.msc → PostgreSQL
# Linux: sudo systemctl start postgresql
```

**OpenAI API Error:**

```bash
# Verify API key is valid
# Check usage limits on OpenAI platform
```

**Frontend Connection Error:**

```bash
# Ensure backend is running on port 8000
# Check CORS_ORIGINS in backend .env
```

## 📈 GEO Score Formula

```
GEO_SCORE = (Presence × 0.35) + (Accuracy × 0.35) + (Trust × 0.20) + Hallucination_Penalty

Where:
- Presence: 0-100 (mentions, citations, directories)
- Accuracy: 0-100 (NAP consistency, data accuracy)
- Trust: 0-100 (sentiment, reviews, trust signals)
- Hallucination_Penalty: -10 to 0 (uncited claims, contradictions)

Final Score Range: 0-100
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

Built during internship - GEO Engine Development Team

## 🙏 Acknowledgments

- OpenAI GPT-4 for AI prompt execution
- FastAPI for high-performance backend
- React team for modern frontend framework
- PostgreSQL for reliable data storage
