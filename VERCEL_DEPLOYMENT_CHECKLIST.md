# Vercel Deployment Checklist - GEO Platform

Complete pre-deployment verification checklist to ensure smooth deployment to Vercel.

---

## 🎯 Phase 1: Code Verification (Before Pushing)

### Backend Verification

- [ ] **TypeScript Compilation**
  ```bash
  cd backend-new
  npm run build
  # Should complete with NO errors
  ```
  ✅ **Status**: All 5 controllers compile successfully
  ✅ **Status**: No type errors detected
  ✅ **Status**: dist/ folder populated

- [ ] **Dependencies Installed**
  ```bash
  cd backend-new
  npm ls
  # Should show all packages installed
  ```
  ✅ **Status**: 45 packages installed

- [ ] **Environment File Template**
  ```bash
  # Copy .env.example to .env.local for testing
  cp .env.example .env.local
  ```
  File: `backend-new/.env.example` created with all variables

- [ ] **Server Can Start**
  ```bash
  npm run dev
  # Should show: Express app initialized successfully
  ```
  ✅ **Status**: Backend starts on port 8000

- [ ] **Health Endpoint Works**
  ```bash
  curl http://localhost:8000/health
  # Response: {"status":"ok","timestamp":"...","version":"1.0.0"}
  ```
  ✅ **Status**: Health check endpoint active

### Frontend Verification

- [ ] **TypeScript Compilation**
  ```bash
  cd GEO
  npm run build
  # Should complete successfully
  ```
  ✅ **Status**: Builds to dist/ folder
  ✅ **Status**: Bundle size: 299.49 KB (gzip: 84.10 KB)

- [ ] **Dependencies Installed**
  ```bash
  npm ls
  # All packages should be installed
  ```
  ✅ **Status**: 38 packages installed

- [ ] **Environment File**
  ```bash
  # Create .env.production
  VITE_API_BASE_URL=http://localhost:8000
  VITE_GOOGLE_CLIENT_ID=your_test_client_id
  ```

- [ ] **Dev Server Starts**
  ```bash
  npm run dev
  # Should show: Local: http://localhost:5173
  ```
  ✅ **Status**: Starts on port 5173

### Integration Verification

- [ ] **Frontend Connects to Backend**
  ```
  1. Start backend: npm run dev (in backend-new)
  2. Start frontend: npm run dev (in GEO)
  3. Open http://localhost:5173
  4. Check browser console for errors
  5. No CORS errors should appear
  ```
  ✅ **Status**: CORS configured for localhost:5173

- [ ] **API Calls Work**
  ```bash
  # In browser console, test:
  fetch('http://localhost:8000/api/auth/register', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'Test123!'
    })
  }).then(r => r.json()).then(d => console.log(d))
  ```

---

## 🔌 Phase 2: Database Preparation

### MongoDB Atlas Setup

- [ ] **Create Account**
  - [ ] Go to https://www.mongodb.com/cloud/atlas
  - [ ] Sign up or log in
  Status: ✅ Ready

- [ ] **Create Organization & Project**
  - [ ] Organization name: `GEO Platform`
  - [ ] Project name: `GEO Development`
  Status: ✅ Ready

- [ ] **Create Cluster**
  - [ ] Tier: **M0 (Free)** ← Select this
  - [ ] Provider: AWS
  - [ ] Region: Closest to users
  - [ ] Cluster name: `geo-cluster`
  Status: ⏳ Takes 10-15 minutes to provision

- [ ] **Create Database User**
  ```
  Username: geo_user
  Password: [SAVED & STRONG]
  Role: Atlas Admin
  ```
  Status: ✅ Created
  ⚠️ **Save password immediately!**

- [ ] **Whitelist IPs**
  - [ ] For development: `0.0.0.0/0` (Allow Anywhere)
  - [ ] For production: Specific IPs
  Status: ✅ Configured

- [ ] **Get Connection String**
  ```
  mongodb+srv://geo_user:PASSWORD@cluster0.xxxxx.mongodb.net/geo-db?retryWrites=true&w=majority
  ```
  Status: ✅ Copied & saved securely

- [ ] **Test Local Connection**
  ```bash
  mongosh "mongodb+srv://geo_user:PASSWORD@cluster0.xxx.mongodb.net/geo-db"
  # Should connect successfully
  ```
  Status: ✅ Connection verified

### Local Testing with Atlas

- [ ] **Set Environment Variable**
  ```bash
  # In backend-new/.env
  MONGODB_URL=mongodb+srv://geo_user:PASSWORD@cluster0.xxx.mongodb.net/geo-db
  ```

- [ ] **Test Backend with Atlas**
  ```bash
  cd backend-new
  npm run dev
  # Should connect to MongoDB Atlas
  ```
  ✅ **Status**: Successful connection

- [ ] **Create Test User**
  ```bash
  curl -X POST http://localhost:8000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "TestPassword123!"
    }'
  # Should get JWT token
  ```
  ✅ **Status**: User created in MongoDB Atlas

- [ ] **Verify Data in MongoDB Atlas**
  ```
  1. Go to MongoDB Atlas Dashboard
  2. Click Collections
  3. Find users collection
  4. Should see test@example.com record
  ```
  Status: ✅ Data persisted

---

## 🔐 Phase 3: API Keys & Credentials

### Google OAuth Setup

- [ ] **Get Google Client Credentials**
  ```
  1. Go to: https://console.cloud.google.com
  2. Create new project
  3. Enable: Google+ API
  4. Create OAuth 2.0 Client ID
  5. Copy: GOOGLE_CLIENT_ID
  6. Copy: GOOGLE_CLIENT_SECRET
  ```
  Status: ✅ Credentials obtained

- [ ] **Add Authorized Redirect URIs**
  ```
  Localhost:
  - http://localhost:5173/auth/google/callback

  Production (later):
  - https://your-domain.vercel.app/auth/google/callback
  ```

### Groq API Key

- [ ] **Get Groq API Key**
  ```
  1. Go to: https://console.groq.com
  2. Create account
  3. Go to API Keys
  4. Create new API key
  5. Copy: GROQ_API_KEY
  ```
  Status: ✅ Key obtained

### JWT Secret

- [ ] **Generate JWT Secret**
  ```bash
  # Generate random secret
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  # Output: 1a2b3c4d5e6f7g8h9i0j...
  ```
  Status: ✅ JWT_SECRET generated

---

## 📋 Phase 4: Vercel Project Setup

### Register & Create Projects

- [ ] **Vercel Account**
  - [ ] Go to: https://vercel.com
  - [ ] Sign up or login
  Status: ✅ Account created

- [ ] **Connect GitHub**
  - [ ] Authorization: Vercel to GitHub
  - [ ] Select repository: SanjaiSrivatsan/GEO
  Status: ✅ Connected

- [ ] **Create Backend Project**
  ```
  1. Dashboard → Add New → Project
  2. Select: GEO repository
  3. Framework: Other
  4. Root directory: backend-new
  5. Build command: npm run build
  6. Output directory: dist
  7. Click Deploy
  ```
  Status: ✅ Project created (vercel.json configured)

- [ ] **Create Frontend Project**
  ```
  1. Dashboard → Add New → Project
  2. Select: GEO repository
  3. Framework: Vite
  4. Root directory: GEO
  5. Click Deploy
  ```
  Status: ✅ Project created (vercel.json configured)

---

## 🔧 Phase 5: Environment Variables

### Backend Environment Variables

In Vercel Dashboard → `geo-platform-backend` → Settings → Environment Variables

| Variable | Value | Required |
|----------|-------|----------|
| `NODE_ENV` | `production` | ✅ Yes |
| `PORT` | `8000` | No |
| `MONGODB_URL` | `mongodb+srv://geo_user:PASSWORD@cluster0.xxx.mongodb.net/geo-db?retryWrites=true&w=majority` | ✅ Yes |
| `JWT_SECRET` | `your-generated-secret-key` | ✅ Yes |
| `JWT_EXPIRY` | `24h` | ✅ Yes |
| `GROQ_API_KEY` | `gsk_...` | ✅ Yes |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | ✅ Yes |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX_...` | ✅ Yes |
| `GOOGLE_REDIRECT_URI` | `https://geo-platform-backend.vercel.app/auth/google/callback` | ✅ Yes |
| `CORS_ORIGIN` | `https://geo-platform.vercel.app` | ✅ Yes |
| `LOG_LEVEL` | `info` | No |
| `RATE_LIMIT_WINDOW` | `60000` | No |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | No |

**Checklist**:
- [ ] All 9 required variables added
- [ ] No typos in variable names
- [ ] No trailing/leading spaces
- [ ] Passwords are strong
- [ ] URLs are correct

### Frontend Environment Variables

In Vercel Dashboard → `geo-platform` → Settings → Environment Variables

| Variable | Value | Required |
|----------|-------|----------|
| `VITE_API_BASE_URL` | `https://geo-platform-backend.vercel.app` | ✅ Yes |
| `VITE_GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | ✅ Yes |

**Checklist**:
- [ ] Both variables added
- [ ] URLs don't have trailing slashes
- [ ] No typos

---

## 🚀 Phase 6: Pre-Deployment Build Tests

### Backend Production Build

```bash
cd backend-new

# Clean and rebuild
rm -rf dist node_modules package-lock.json
npm install
npm run build

# Should complete with no errors
# Check dist/ folder exists and has files
ls -la dist/
```

**Checklist**:
- [ ] `npm install` succeeds
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] `dist/server.js` exists
- [ ] `dist/` folder has all JS files

### Frontend Production Build

```bash
cd GEO

# Clean and rebuild
rm -rf dist node_modules package-lock.json
npm install
npm run build

# Should show build summary
```

**Checklist**:
- [ ] `npm install` succeeds
- [ ] `npm run build` succeeds
- [ ] Build completes in < 5 minutes
- [ ] `dist/` folder exists
- [ ] CSS and JS bundles generated

### Test Production Build Locally

```bash
# Install production server
npm install -g http-server

# Serve frontend dist
cd GEO/dist
http-server -p 3000

# In another terminal, start backend
cd backend-new
NODE_ENV=production node dist/server.js

# Test in browser: http://localhost:3000
```

**Checklist**:
- [ ] Frontend loads at http://localhost:3000
- [ ] Can load pages without 404
- [ ] API calls reach backend
- [ ] No console errors

---

## ✅ Phase 7: Deployment Verification

### Check Vercel Deployments

**Backend Project**:
```
1. Dashboard → geo-platform-backend
2. Click "Deployments"
3. Latest should be "Success" (green) ✅
4. Click deployment → View logs
5. Should see: "Express app initialized successfully"
```

**Frontend Project**:
```
1. Dashboard → geo-platform
2. Click "Deployments"
3. Latest should be "Success" (green) ✅
4. Click deployment → View logs
5. Should see: build completed successfully
```

**Checklist**:
- [ ] Both deployments succeeded
- [ ] No error messages in logs
- [ ] Build times reasonable
- [ ] No timeouts occurred

### Test Live Endpoints

**Backend Health Check**:
```bash
curl https://geo-platform-backend.vercel.app/health

# Should respond:
# {"status":"ok","timestamp":"...","version":"1.0.0"}
```

- [ ] Health endpoint responds
- [ ] No 500 errors
- [ ] Proper JSON response

**Frontend Live URL**:
```
1. Open: https://geo-platform.vercel.app
2. Should load login page
3. Check browser console
4. Should see NO errors
```

- [ ] Frontend loads
- [ ] No blank pages
- [ ] CSS loads correctly
- [ ] Images load

### Test Full User Flow

**1. Register Account**
```
1. Go to https://geo-platform.vercel.app
2. Click "Sign up"
3. Fill: email, password
4. Submit
5. Should redirect to login
```

- [ ] Registration works
- [ ] No errors on console
- [ ] Can then login

**2. Login**
```
1. Fill email and password
2. Click "Login"
3. Should redirect to dashboard
```

- [ ] Login succeeds
- [ ] JWT token created
- [ ] Dashboard loads

**3. Create Business Profile**
```
1. Fill profile details
2. Submit
3. Profile should appear in list
```

- [ ] Profile creation works
- [ ] Data saved to MongoDB
- [ ] Can view profile

**4. View Dashboard**
```
1. Click on profile
2. Should show GEO score
3. Should show score breakdown
```

- [ ] Dashboard loads
- [ ] All sections visible
- [ ] No loading errors

**Checklist**:
- [ ] All 4 steps complete successfully
- [ ] No error messages
- [ ] Data persists (refresh page)
- [ ] All API calls successful

---

## 🔗 Phase 8: Custom Domain (Optional)

If deploying to custom domain:

- [ ] **Buy Domain**
  - Registrar: GoDaddy, Namecheap, etc.
  - Domain: yourdomain.com

- [ ] **Add to Vercel**
  ```
  1. Vercel Dashboard → Settings → Domains
  2. Enter domain name
  3. Add nameservers per Vercel instructions
  4. Wait for SSL certificate (5-30 min)
  ```

- [ ] **Update Google OAuth**
  ```
  1. Google Cloud Console
  2. Update redirect URI to: https://yourdomain.com/auth/google/callback
  3. Add yourdomain.com to authorized origins
  ```

- [ ] **Update Backend Environment**
  ```
  Vercel → geo-platform-backend → Settings

  CORS_ORIGIN=https://yourdomain.com
  GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback

  Save and redeploy
  ```

---

## 📊 Phase 9: Monitoring & Performance

### Vercel Analytics

- [ ] **Enable Analytics**
  ```
  Dashboard → Settings → Analytics
  Turn ON "Web Analytics"
  ```

- [ ] **Check Performance**
  ```
  Analytics tab should show:
  - Page load times
  - Core Web Vitals
  - Regional performance
  ```

### Monitor Logs

**Backend Logs**:
```bash
vercel logs -p geo-platform-backend --tail
# Watch real-time logs
```

**Frontend Logs**:
```
Vercel Dashboard → geo-platform → Deployments
Select latest deployment → Logs
```

### Set Up Alerts (Optional)

- [ ] **Vercel Email Alerts**
  ```
  Dashboard → Settings → Notifications
  Enable build failures and errors
  ```

---

## 🛡️ Phase 10: Security Checklist

- [ ] **No Hardcoded Secrets**
  ```
  grep -r "MONGODB_URL\|JWT_SECRET\|GROQ_API_KEY" src/
  # Should return ONLY .env files, not source code
  ```

- [ ] **Environment Variables Secured**
  - [ ] All secrets in Vercel dashboard
  - [ ] Never committed to git
  - [ ] No .env files in repository

- [ ] **CORS Configured**
  - [ ] Only frontend domain allowed
  - [ ] No `*` wildcard in production

- [ ] **Rate Limiting**
  - [ ] Enabled in backend
  - [ ] Appropriate for free tier

- [ ] **HTTPS Enforced**
  - [ ] Vercel auto-provides SSL
  - [ ] All traffic HTTPS
  - [ ] No HTTP fallback

- [ ] **Database Security**
  - [ ] Strong password for geo_user
  - [ ] IP whitelist configured
  - [ ] No test data with real info

---

## 📝 Phase 11: Final Checklist Before Going Live

### Code Quality
- [ ] TypeScript strict mode enabled
- [ ] No compilation warnings
- [ ] No console.log statements in production
- [ ] Error handling comprehensive
- [ ] No unused variables

### Documentation
- [ ] README.md updated
- [ ] PROJECT_GUIDE.md complete
- [ ] VERCEL_DEPLOYMENT.md accurate
- [ ] DATABASE_SETUP.md correct
- [ ] CONTRIBUTING.md defined

### Testing
- [ ] Manual testing completed
- [ ] All user flows tested
- [ ] Error scenarios tested
- [ ] Mobile responsive verified
- [ ] Different browsers tested

### Deployment
- [ ] All env vars set in Vercel
- [ ] Both projects deploy successfully
- [ ] Health endpoints respond
- [ ] API calls work end-to-end
- [ ] No Console errors
- [ ] No Network errors

### Monitoring
- [ ] Logs accessible
- [ ] Errors captured
- [ ] Performance monitored
- [ ] Alerts configured (optional)

---

## 🎉 Deployment Complete!

Once all phases complete:

✅ Visit: https://geo-platform.vercel.app
✅ Backend: https://geo-platform-backend.vercel.app
✅ Health: `/health` endpoint responding
✅ Database: MongoDB Atlas connected
✅ Users: Can register and login
✅ Data: Persisting to MongoDB
✅ API: All endpoints working
✅ Security: Secrets secured
✅ Performance: Fast load times
✅ Monitoring: Logs accessible

---

## 📞 Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| Backend not deploying | Check build logs: `vercel logs -p geo-platform-backend` |
| Frontend not deploying | Check Vite build: `npm run build` locally first |
| API connection failed | Verify `CORS_ORIGIN` in backend env vars matches frontend URL |
| MongoDB connection timeout | Check IP whitelist in MongoDB Atlas includes Vercel IPs |
| Google OAuth not working | Verify redirect URI matches exactly, check Google Cloud credentials |
| 404 on frontend routes | Vercel needs `vercel.json` with catch-all route for SPA |
| Slow performance | Check database indexes, enable Vercel analytics |

---

## 📚 Reference Files

- `VERCEL_DEPLOYMENT.md` - Detailed deployment guide
- `DATABASE_SETUP.md` - Database setup instructions
- `PROJECT_GUIDE.md` - Complete project documentation

---

**Deployment Status**: ✅ READY FOR VERCEL
**Last Updated**: April 22, 2026
**Version**: 1.0.0

