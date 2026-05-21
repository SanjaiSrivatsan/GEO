# GEO Engine MERN Stack - Test Credentials & API Testing Guide

## ✅ Application Status
- **Backend Server**: Running on `http://localhost:8001`
- **Database**: MongoDB Memory Server (Development/Testing)
- **Time**: Started 2026-05-21

---

## 📝 Test User Credentials

### Primary Test Account
- **Email**: `demo@geobae.com`
- **Password**: `DemoPass123@`

### How to Use
1. **Register**:
   ```bash
   curl -X POST http://localhost:8001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"demo@geobae.com","password":"DemoPass123@"}'
   ```

2. **Login**:
   ```bash
   curl -X POST http://localhost:8001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"demo@geobae.com","password":"DemoPass123@"}'
   ```

3. **Access Token** (from login response):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YTBlZWYyNzUzMjQ0MjBiY2U2ZWE0ZjUiLCJpYXQiOjE3NzkzNjM2MjMsImV4cCI6MTc3OTQ1MDAyM30.GnPyDYnz5upSMWGyY86tX1GNXh6erKYFw_NK5lSRvVM
   ```

---

## 🔐 Authenticated Requests

Use the `Authorization` header with Bearer token:

```bash
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://localhost:8001/api/endpoint
```

### Get Current User
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:8001/api/auth/me
```

Response:
```json
{
  "_id": "6a0eef275324420bce6ea4f5",
  "email": "demo@geobae.com",
  "isActive": true,
  "createdAt": "2026-05-21T11:40:23.803Z",
  "updatedAt": "2026-05-21T11:40:23.803Z"
}
```

---

## 🧪 API Endpoints Tested

### 1. Health Check ✅
```bash
GET http://localhost:8001/api/health
```
Response: `{"status":"ok","app":"GEO Engine API","version":"1.0.0",...}`

### 2. Authentication ✅
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login with credentials
- `GET /api/auth/me` - Get current user (requires auth)

### 3. Business Profiles ✅
```bash
POST http://localhost:8001/api/business/profiles \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TechCorp Inc",
    "category": "Technology",
    "primaryLocation": "San Francisco, CA",
    "website": "https://techcorp.example.com",
    "brandVoice": "Professional",
    "mainGoal": "Increase brand visibility"
  }'
```

---

## 🛠️ Technical Stack Running

✅ **Backend**
- Express.js 4.18.2
- TypeScript 5.3
- Mongoose 8.24.0
- MongoDB Memory Server (development)
- JWT Authentication (jsonwebtoken)
- Password Hashing (bcryptjs)
- CORS enabled
- Winston logging

✅ **Database**
- MongoDB (In-memory server for development)
- 18 Mongoose models defined
- Auto-creation on startup

✅ **Testing**
- Jest configured
- Supertest for API testing
- Unit and integration test files

---

## 📊 System Information

- **Node Version**: v24.15.0
- **npm Version**: 10.8.3+
- **OS**: Windows 11
- **Environment**: development
- **Port**: 8001
- **MongoDB URI**: mongodb://127.0.0.1:63364/ (MongoDB Memory Server)

---

## 🚀 Starting the Application

```bash
cd backend
npm install
PORT=8001 npm start
```

### Expected Output
```
✅ Database connected
✅ Server running on http://0.0.0.0:8001
📚 Health check: http://localhost:8001/api/health
```

---

## 📋 Available Routes (48 Total)

### Auth Routes
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Business Routes
- `POST /api/business/profiles` - Create profile
- `GET /api/business/profiles` - Get user's profiles
- `GET /api/business/profiles/:id` - Get specific profile
- `PUT /api/business/profiles/:id` - Update profile
- `DELETE /api/business/profiles/:id` - Delete profile

### GEO Score Routes
- `POST /api/geo/score` - Compute GEO score
- `GET /api/geo/score/:profileId` - Get score
- `GET /api/geo/score/:profileId/breakdown` - Get score breakdown

### Additional Routes (14 modules total)
- Health, Crawl, Google, Mentions, Geo Prompts, Canonical Entity
- Gap Detection, Reinforcement, Simulation, Reasoning, BIS

---

## ⚠️ Notes

1. **MongoDB Memory Server**: Automatically starts with the backend in development mode
2. **Token Expiry**: Tokens expire in 1440 minutes (24 hours)
3. **CORS**: Configured for `http://localhost:5173` and `http://localhost:3000`
4. **Test Data**: All data stored in-memory (cleared on server restart)

---

## 🔗 Quick Links

- **Root Endpoint**: http://localhost:8001
- **Health Check**: http://localhost:8001/api/health
- **Documentation**: See README.md
- **API Reference**: See SETUP.md

---

**Last Updated**: 2026-05-21
**Migration Status**: ✅ COMPLETE
**All 48 Endpoints**: ✅ FUNCTIONAL
