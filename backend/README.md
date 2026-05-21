# GEO Engine - MERN Stack Backend API

Complete Node.js + Express + MongoDB implementation of the GEO (Generative Engine Optimization) platform - AI-powered business visibility scoring system.

## 📋 Overview

This is a production-ready MERN backend migration from the original FastAPI + PostgreSQL implementation. All 48 API endpoints, 18 data models, and business logic have been converted to Node.js while maintaining 100% API contract compatibility.

## 🚀 Features

- **GEO Score Calculation** - Deterministic scoring (Presence, Accuracy, Trust, Hallucination Penalty)
- **18 MongoDB Collections** - Full data model with relationships and indexes
- **48 API Endpoints** - All routes with identical FastAPI contracts
- **JWT Authentication** - Secure Bearer token auth with bcrypt hashing
- **Production Ready** - Error handling, logging, CORS, middleware
- **Full Test Suite** - Jest + Supertest coverage
- **TypeScript** - Full type safety throughout

## 🛠️ Tech Stack

- Node.js 18+ with TypeScript
- Express.js + Mongoose
- MongoDB (Atlas or local)
- JWT + bcryptjs authentication
- Jest + Supertest testing
- Winston logging
- Bull queues (optional)

## 📦 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env

# 3. Edit .env with MongoDB URI
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/geo_db

# 4. Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output to JWT_SECRET in .env

# 5. Start development server
npm run dev

# Server running on http://localhost:8000
```

## 📡 API Endpoints (48 Total)

### Auth (3 endpoints)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Business (4 endpoints)
- `POST /api/business/profiles`
- `GET /api/business/profiles`
- `GET /api/business/profiles/current`
- `GET /api/business/profiles/:id`

### GEO Score (3 endpoints)
- `POST /api/geo/score/compute`
- `GET /api/geo/score/:id`
- `GET /api/geo/score/breakdown/:id`

### Plus 38 more endpoints for:
- Crawling, Google Business, Mentions
- GEO Prompts, Intelligence Engine
- BIS, Health monitoring

## 🗄️ Database

18 MongoDB Collections:
- User, BusinessProfile, WebsiteContent
- GoogleConnection, GoogleLocation, GoogleReview
- BrandMention, CanonicalEntity
- GeoPrompt, GeoPromptResult, GeoResponse, GeoScore
- ChatSession, GapIssue, ReinforcementTask
- SimulationRun, ReasoningAnalysis

Auto-created on startup with proper indexes and relationships.

## 🔐 Authentication

All protected endpoints require JWT Bearer token:

```bash
Authorization: Bearer <token>
```

Get token from login response, expires in 24 hours.

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## 📚 Scripts

```bash
npm run dev      # Development server with auto-reload
npm run build    # Compile TypeScript
npm start        # Production server
npm run lint     # ESLint check
```

## 🔒 Environment Variables

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
PORT=8000
NODE_ENV=development
JWT_SECRET=generated-secret-key
JWT_EXPIRE_IN=1440m
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
OPENAI_API_KEY=sk-proj-...
```

## 📁 Project Structure

```
src/
├── config/       # Database, environment, logging
├── models/       # Mongoose schemas (18)
├── routes/       # Express handlers (14 modules)
├── services/     # Business logic
├── middleware/   # Auth, errors, CORS
├── types/        # TypeScript interfaces
├── utils/        # Helpers, constants, errors
├── __tests__/    # Jest tests
├── app.ts        # Express app
└── index.ts      # Entry point
```

## 🔄 Frontend Integration

Update frontend `api.ts`:

```typescript
const BASE_URL = 'http://localhost:8000/api';
```

No component changes needed - API contracts preserved.

## ✅ Production Checklist

- [ ] Database: MongoDB Atlas configured
- [ ] JWT Secret: Generated and unique
- [ ] CORS: Frontend URLs whitelisted
- [ ] API Keys: OpenAI, Google (if using)
- [ ] Logging: Winston configured
- [ ] Tests: All passing
- [ ] Build: TypeScript compiles
- [ ] Deployment: Ready for production

## 🐛 Troubleshooting

**MongoDB connection fails:**
- Check MONGODB_URI in .env
- Verify IP whitelist in MongoDB Atlas
- Test with `mongosh` or Compass

**JWT token errors:**
- Regenerate JWT_SECRET
- Verify token in Authorization header
- Check token expiry

**Port already in use:**
- Change PORT in .env
- Or: `lsof -ti:8000 | xargs kill -9`

## 📞 Support

- Check logs: `cat logs/error.log`
- Run tests: `npm test`
- Verify config: `echo $MONGODB_URI`

## 📄 License

MIT License
