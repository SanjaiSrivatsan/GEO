# GEO Engine - Complete MERN Stack Setup Guide

Complete setup instructions for the GEO (Generative Engine Optimization) platform - MERN Stack.

## 📋 Project Overview

**Status:** ✅ Complete MERN migration from FastAPI to Express + MongoDB

**What's Included:**
- ✅ 48 API endpoints (100% API compatible)
- ✅ 18 MongoDB collections (auto-created)
- ✅ JWT authentication with bcrypt
- ✅ Full test suite (Jest + Supertest)
- ✅ TypeScript throughout
- ✅ React frontend (unchanged)

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier ok)
- Git

### Step 1: Backend Setup

```bash
cd backend
npm install
cp .env.example .env

# Edit .env with MongoDB URI and generated JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npm run dev  # Runs on http://localhost:8000
```

### Step 2: Frontend Setup

```bash
cd GEO
npm install
npm run dev  # Runs on http://localhost:5173
```

## 🗄️ MongoDB Setup

### Use MongoDB Atlas (Recommended)
1. https://www.mongodb.com/cloud/atlas
2. Create free M0 cluster
3. Create database user
4. Get connection string
5. Add to `.env` as `MONGODB_URI`

Collections auto-created on startup.

## 📡 API Endpoints (48 Total)

All endpoints maintain exact compatibility with original FastAPI:

- **Auth (3):** Register, Login, Get user
- **Business (4):** Create, Read, List, Current
- **GEO Score (3):** Compute, Get, Breakdown
- **Crawling (3):** Start, Status, Content
- **Google (7):** Auth, Connection, Locations, Reviews
- **Mentions (3):** Discover, Get, Stats  
- **Prompts (3):** Run, Results, Library
- **Intelligence (14):** Canonical, Gaps, Reinforcement, Simulation, Reasoning
- **BIS (6):** Scan, Results, Brands, Mentions, Stats, Logs
- **Health (2):** Health, Ping

## 🧪 Testing

```bash
cd backend
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage
```

## 📊 Database (18 Collections)

Auto-created with proper relationships and indexes:
- User, BusinessProfile, WebsiteContent
- GoogleConnection, GoogleLocation, GoogleReview
- BrandMention, CanonicalEntity
- GeoPrompt, GeoPromptResult, GeoResponse, GeoScore  
- ChatSession, GapIssue, ReinforcementTask
- SimulationRun, ReasoningAnalysis

## 🔐 Authentication

JWT Bearer token required for protected endpoints:

```bash
Authorization: Bearer <token>
```

Token obtained from login response, expires in 24 hours.

## 📁 Project Structure

```
backend/src/
├── config/       # Database, environment
├── models/       # Mongoose schemas (18)
├── routes/       # Express handlers (14 modules)
├── services/     # Business logic
├── middleware/   # Auth, errors, CORS
├── types/        # TypeScript interfaces
├── utils/        # Helpers, constants
├── __tests__/    # Jest tests
├── app.ts        # Express app
└── index.ts      # Entry point
```

## ✅ Production Deployment

### Heroku
```bash
heroku create geo-engine-api
heroku config:set MONGODB_URI="..."
heroku config:set JWT_SECRET="..."
git push heroku main
```

### Docker
```bash
docker build -t geo-engine .
docker run -p 8000:8000 --env-file .env geo-engine
```

## 🐛 Troubleshooting

**MongoDB connection fails:**
- Verify MONGODB_URI in .env
- Check IP whitelist in MongoDB Atlas
- Ensure internet connectivity

**JWT errors:**
- Regenerate JWT_SECRET
- Check token in Authorization header

**Port 8000 in use:**
- Change PORT in .env
- Or kill process: `lsof -ti:8000 | xargs kill -9`

**Tests failing:**
- Ensure MongoDB is accessible
- Run: `npm test` to see details
- Check logs: `cat logs/error.log`

## 📚 Documentation

- **Backend:** `backend/README.md`
- **This guide:** `SETUP.md`
- **API Reference:** Endpoints documented in backend/README.md

## 🔄 Frontend Integration

Frontend already configured to use new backend:
- `GEO/src/utils/api.ts` points to `http://localhost:8000/api`
- No component changes needed
- 100% API contract maintained

## 🎉 Ready to Go!

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd GEO && npm run dev

# Open browser
http://localhost:5173
```

Enjoy your MERN stack! 🚀
