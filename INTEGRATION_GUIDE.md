# GEO Backend-Frontend Integration Guide

## Quick Start

### Prerequisites
- Node.js v22.x installed
- npm installed
- Two terminal windows open

### Step 1: Start Backend Server

```bash
cd "D:\Internship Works\FINAL GEO IMPLEMENTATION\backend-new"
node dist/server.js
```

Expected output:
```
[timestamp] INFO: Express app initialized successfully
[timestamp] WARN: MongoDB connection failed. Running in offline mode.
[timestamp] INFO: ✓ GEO Engine v1.0.0 running on http://localhost:8000
```

The backend will run in **offline mode** if MongoDB is unavailable, allowing testing of:
- ✓ Authentication (register, login, getMe)
- ✓ Business profile CRUD operations (without database persistence)
- ✓ All API response structure validation

### Step 2: Start Frontend Server (New Terminal)

```bash
cd "D:\Internship Works\FINAL GEO IMPLEMENTATION\GEO"
npm run dev
```

Expected output:
```
  VITE v7.2.4  ready in [X] ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

Frontend is ready at: **http://localhost:5173**

---

## Testing the Integration

### Option A: Automated Test Script

```bash
cd "D:\Internship Works\FINAL GEO IMPLEMENTATION\backend-new"
bash test-integration.sh
```

This script tests:
1. Health check endpoint
2. User registration
3. Current user endpoint
4. Business profile creation
5. Business profile listing
6. Business profile retrieval
7. User login

### Option B: Manual Testing in Browser

1. Open: **http://localhost:5173**
2. Register with an email and password
3. Verify JWT token appears in Browser DevTools → Application → localStorage → `geo_auth_token`
4. Create a business profile
5. Verify profile appears in the business list

### Option C: cURL Commands

```bash
# Register new user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@"}'

# Extract the token from response, then use it:
export TOKEN="your_token_here"

# Get current user
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Create business profile
curl -X POST http://localhost:8000/api/business/profiles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"My Business",
    "category":"Retail",
    "primaryLocation":"NYC",
    "website":"https://example.com",
    "brandVoice":"Professional",
    "mainGoal":"Increase visibility"
  }'

# List business profiles
curl -X GET http://localhost:8000/api/business/profiles \
  -H "Authorization: Bearer $TOKEN"
```

---

## API Response Format

### Authentication Responses

**Register/Login Success**:
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "is_active": true,
    "created_at": "2026-04-18T14:30:00.000Z",
    "updated_at": "2026-04-18T14:30:00.000Z"
  },
  "token": {
    "access_token": "eyJhbGc...",
    "token_type": "bearer",
    "expires_in": 86400
  }
}
```

### Business Profile Responses

**Create Profile**:
```json
{
  "profile": {
    "id": "507f1f77bcf86cd799439012",
    "user_id": "507f1f77bcf86cd799439011",
    "name": "My Business",
    "category": "Retail",
    "primary_location": "NYC",
    "website": "https://example.com",
    "brand_voice": "Professional",
    "main_goal": "Increase visibility",
    "crawl_status": "not_started",
    "created_at": "2026-04-18T14:35:00.000Z",
    "updated_at": "2026-04-18T14:35:00.000Z"
  },
  "message": "Business profile created successfully"
}
```

**List Profiles**:
```json
{
  "profiles": [
    { /* profile object with snake_case fields */ }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  }
}
```

---

## Architecture Summary

| Component | Technology | Port | Status |
|-----------|-----------|------|--------|
| **Frontend** | React 19 + TypeScript + Vite | 5173 | Ready ✓ |
| **Backend** | Express + TypeScript | 8000 | Ready ✓ |
| **Database** | MongoDB | 27017 | Optional (development mode works without it) |
| **API Base URL** | http://localhost:8000/api | - | Configured ✓ |

---

## Key Integration Features

### ✓ Authentication Flow
- Frontend sends credentials to `POST /api/auth/register`
- Backend returns JWT token in snake_case format
- Frontend stores token in localStorage under key `geo_auth_token`
- Frontend automatically includes `Authorization: Bearer {token}` header on all protected requests

### ✓ Field Naming Consistency
All responses use **snake_case** for field names:
- `isActive` → `is_active`
- `createdAt` → `created_at`
- `accessToken` → `access_token`
- `tokenType` → `token_type`

### ✓ Error Handling
API errors follow this format:
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "statusCode": 400,
  "data": {
    "body": ["email: Invalid email format"]
  }
}
```

Frontend automatically handles:
- 401 (Unauthorized) → Clears token and redirects to login
- Network errors → Displays error message
- Type validation → TypeScript ensures compile-time safety

### ✓ CORS Configuration
Backend configured to accept requests from:
- `http://localhost:5173` (frontend development)
- `localhost` (for local testing)

### ✓ Rate Limiting
- 100 requests per minute per IP
- Applied to all `/api/` routes

---

## Troubleshooting

### Backend Won't Start
```bash
# Check if another process is using port 8000
netstat -an | grep 8000

# Kill the process (Windows PowerShell)
Get-Process | Where {$_.mainWindowTitle -like "*node*"} | Stop-Process
```

### Frontend Can't Connect to Backend
- Verify backend is running on port 8000
- Check browser DevTools → Network tab for failed requests
- Verify CORS headers in response (should have `Access-Control-Allow-Origin`)

### 401 Errors on Authenticated Routes
- Check token is in localStorage: `localStorage.getItem('geo_auth_token')`
- Verify token format: should start with `eyJ...`
- Check `Authorization` header in request: should be `Bearer {token}`

### DatabaseError in Logs
- This is expected in offline mode
- To use full features, install and run MongoDB:
  ```bash
  # Download from https://www.mongodb.com/try/download/community
  # Or use Docker
  docker run -d -p 27017:27017 mongo
  ```

---

## Next Steps

1. ✓ Backend running in offline mode
2. ✓ Frontend configured with correct API URL
3. ✓ Core auth endpoints working
4. ✓ Business profile endpoints working

To enable full features:
- Install MongoDB on localhost:27017
- Restart backend (it will auto-detect MongoDB)
- All CRUD operations will now persist to database

To implement additional features:
- See `backend-new/src/services/` for service implementations
- Update frontendlike in `GEO/src/utils/api.ts` with your business logic
- Add new routes in `backend-new/src/routes/`

---

## File Structure

```
D:\Internship Works\FINAL GEO IMPLEMENTATION\
├── backend-new/                    # Express backend
│   ├── src/
│   │   ├── server.ts              # Entry point
│   │   ├── app.ts                 # Express app config
│   │   ├── config/
│   │   ├── models/                # 16 Mongoose schemas
│   │   ├── services/              # Business logic (11 services)
│   │   ├── controllers/           # Request handlers (5 controllers)
│   │   ├── routes/                # API routes
│   │   ├── middleware/            # Auth, validation, error handling
│   │   └── utils/                 # Helpers and validators
│   ├── dist/                       # Compiled JavaScript
│   ├── test-integration.sh         # Integration test script
│   └── package.json
│
└── GEO/                            # React frontend
    ├── src/
    │   ├── App.tsx                # Main app component
    │   ├── pages/                 # Page components
    │   ├── utils/
    │   │   ├── api.ts             # API service (1,225 lines)
    │   │   └── auth.ts            # JWT token management
    │   └── types.ts               # TypeScript interfaces
    ├── vite.config.ts
    ├── tsconfig.json
    └── package.json
```

---

**Created**: 2026-04-18
**Status**: Ready for Integration Testing ✓
