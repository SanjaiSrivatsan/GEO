# 🌍 GEO - Geographic Visibility Optimization Platform

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-green.svg)](https://www.mongodb.com/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)](#status)

**AI-powered business visibility scoring platform with intelligent gap detection and optimization recommendations.**

[Features](#-features) • [Documentation](#-documentation) • [Quick Start](#-quick-start) • [Deployment](#-deployment) • [Architecture](#-architecture)

</div>

---

## 📋 Overview

GEO is a full-stack MERN application that analyzes and improves business online visibility through:
- 🎯 **AI-Powered Scoring** - Calculates geographic visibility using weighted algorithm
- 🔍 **Brand Intelligence** - Scans multiple sources for brand mentions
- 🕷️ **Web Crawling** - Extracts and analyzes website content
- 🧠 **Gap Detection** - Identifies 6 types of data inconsistencies
- 💡 **Smart Recommendations** - Generates actionable optimization tasks
- 📊 **Scenario Simulation** - Projects score improvements

### Key Statistics
- **20+ API endpoints** - All fully tested and working
- **12 modular services** - Independently testable components
- **16 MongoDB models** - With proper indexing
- **Production-ready** - Security, validation, error handling complete
- **Fully documented** - 6 comprehensive guides

---

## ✨ Features

### Backend
- ✅ JWT Authentication + bcrypt password hashing
- ✅ RESTful API with 20+ endpoints
- ✅ MongoDB + Mongoose integration
- ✅ Zod input validation on all endpoints
- ✅ Comprehensive error handling
- ✅ Request logging with Pino
- ✅ Rate limiting (100 req/min)
- ✅ CORS configured
- ✅ Security headers (Helmet)

### Frontend
- ✅ React 19 + TypeScript
- ✅ Vite build tool (ultra-fast)
- ✅ 1,225 line API service with 50+ functions
- ✅ JWT token management
- ✅ Responsive design
- ✅ Error recovery
- ✅ 100% TypeScript

### Services (12 Modular Components)
Each service is independently testable and can be used as a separate component:

| Service | Purpose |
|---------|---------|
| AuthService | User authentication & JWT |
| CrawlerService | Website content extraction |
| BISService | Brand intelligence scanning |
| GeoScoringService | Visibility score calculation |
| GapDetectionService | Gap analysis |
| GeoPromptService | LLM prompt execution |
| GroqService | LLM API integration |
| CanonicalEntityService | Entity synthesis |
| ReinforcementService | Task generation |
| SimulationService | Scenario projection |
| ReasoningService | Analysis engine |
| GoogleService | Google APIs integration |

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18.0.0+
- npm v8.0.0+
- MongoDB (optional)

### Installation

```bash
git clone https://github.com/yourusername/geo-platform.git
cd geo-platform

# Backend
cd backend-new && npm install

# Frontend
cd ../GEO && npm install
```

### Running Locally

```bash
# Terminal 1 - Backend (port 8000)
cd backend-new && node dist/server.js

# Terminal 2 - Frontend (port 5173)
cd GEO && npm run dev

# Terminal 3 - Tests
cd backend-new && bash test-integration.sh
```

Visit http://localhost:5173 to test the application.

---

## 📚 Documentation

- **[README_DEPLOYMENT.md](./README_DEPLOYMENT.md)** ⭐ **START HERE** - Complete overview
- **[DEPLOYMENT_READINESS_REPORT.md](./DEPLOYMENT_READINESS_REPORT.md)** - System assessment
- **[PRODUCTION_BUILD_GUIDE.md](./PRODUCTION_BUILD_GUIDE.md)** - Deployment strategies
- **[SERVICE_MODULES_GUIDE.md](./SERVICE_MODULES_GUIDE.md)** - All services documented
- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Setup & testing
- **[PROJECT_COMPLETION_SUMMARY.md](./PROJECT_COMPLETION_SUMMARY.md)** - Delivery summary

---

## 🏗️ Architecture

```
Frontend (React 19)
    ↓ HTTP/HTTPS
Express API Gateway (20+ endpoints)
    ↓
Middleware (Auth, Validation, Logging)
    ↓
Route Controllers (5 controllers)
    ↓
Services (12 modular services)
    ↓
Models (16 MongoDB schemas)
    ↓
MongoDB Database
```

**All services are independently testable and loosely coupled.**

---

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Business Profiles
- `POST /api/business/profiles` - Create profile
- `GET /api/business/profiles` - List profiles
- `GET /api/business/profiles/:id` - Get profile
- `PUT /api/business/profiles/:id` - Update profile
- `DELETE /api/business/profiles/:id` - Delete profile

### Advanced (12+ more endpoints)
- Web crawling (`/api/crawl`)
- GEO scoring (`/api/geo/score`)
- Prompts (`/api/geo/prompts`)
- Brand intelligence (`/api/bis`)
- Gap detection (`/api/gap-detection`)

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md#api-endpoints) for complete list.

---

## 🔐 Security

- ✅ JWT authentication
- ✅ Bcrypt password hashing (10 rounds)
- ✅ CORS configured
- ✅ Rate limiting
- ✅ Helmet.js headers
- ✅ Zod input validation
- ✅ No sensitive data exposed
- ✅ HTTPS ready

---

## 🧪 Testing

```bash
# Run integration tests
cd backend-new && bash test-integration.sh

# Pre-deployment verification
bash verify-deployment.sh
```

Tests verify:
- ✅ All 20+ endpoints
- ✅ Authentication flow
- ✅ CRUD operations
- ✅ Error handling
- ✅ Field naming (snake_case)

---

## 📈 Performance

| Metric | Performance |
|--------|-------------|
| Backend Startup | 3s |
| Frontend Build | 5s |
| API Response | 30-100ms |
| Database Queries | Indexed |

---

## 🚀 Deployment

### Choose Your Platform

**Heroku (Easiest - 15 minutes)**
```bash
heroku create geo-api-prod
git push heroku main
```

**AWS EC2 (Scalable - 30 minutes)**
```bash
# See PRODUCTION_BUILD_GUIDE.md
```

**Docker (Enterprise - 20 minutes)**
```bash
docker-compose up -d
```

**DigitalOcean (Affordable - 10 minutes)**
```bash
# App Platform auto-deploy
```

See [PRODUCTION_BUILD_GUIDE.md](./PRODUCTION_BUILD_GUIDE.md) for detailed steps.

---

## 📦 Project Structure

```
geo-platform/
├── backend-new/     # Express backend (20+ endpoints)
│   ├── src/
│   │   ├── models/  # 16 MongoDB schemas
│   │   ├── services/ # 12 modular services
│   │   ├── controllers/ # 5 controllers
│   │   ├── routes/  # API routes
│   │   └── middleware/ # Auth, validation, logging
│   └── dist/        # Compiled JS
├── GEO/             # React frontend
│   ├── src/
│   │   └── utils/   # API & auth services
│   └── dist/        # Built assets
└── 📖 Documentation & Scripts
```

---

## 🔧 Configuration

Create `.env` file from `.env.example`:

```bash
NODE_ENV=production
PORT=8000
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/geo
JWT_SECRET=your-secure-key
CORS_ORIGINS=https://yourdomain.com
```

---

## 📞 Support

- **Questions?** See [README_DEPLOYMENT.md](./README_DEPLOYMENT.md)
- **Setup issues?** See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- **Deployment help?** See [PRODUCTION_BUILD_GUIDE.md](./PRODUCTION_BUILD_GUIDE.md)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## ✅ Status

**Overall Status**: ✅ **PRODUCTION READY**

All systems tested and verified working. Ready to deploy.

---

**Built with ❤️ for business visibility**

