# Vercel Deployment Guide - GEO Platform

Complete step-by-step guide to deploy the GEO Platform (MERN Stack) on Vercel.

---

## Prerequisites

✅ Node.js v20+ installed locally
✅ Git repository on GitHub
✅ Vercel account (free or paid)
✅ MongoDB Atlas account (free or paid)
✅ Groq API key
✅ Google OAuth credentials

---

## Architecture Overview

```
Frontend (React 19 + Vite)
    ↓
Vercel (Serverless Functions)
    ↓
Backend (Express.js)
    ↓
MongoDB Atlas (Database)
```

---

## Step 1: Prepare Backend for Vercel

### Install Vercel Adapter

```bash
cd backend-new
npm install --save-dev vercel
```

### Create `vercel.json` in `backend-new/`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Update `backend-new/package.json` build script

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "nodemon --exec ts-node src/index.ts"
  }
}
```

---

## Step 2: Setup MongoDB Atlas (Cloud Database)

### Create Free MongoDB Cluster

1. Go to: https://www.mongodb.com/cloud/atlas
2. Sign up or log in
3. Click "Create" → "Build a Database"
4. Select **FREE** (M0) tier
5. Choose region closest to your location
6. Click "Create Cluster"

### Create Database User

1. In MongoDB Atlas, go to **Security** → **Database Access**
2. Click **Add New Database User**
3. Set:
   - Username: `geo_user`
   - Password: Generate strong password (save it!)
   - Built-in Role: `Atlas Admin`
4. Click **Add User**

### Whitelist IP Address

1. Go to **Security** → **Network Access**
2. Click **Add IP Address**
3. Select **Allow Access from Anywhere** (for development)
   - Or enter specific IPs if known
4. Click **Confirm**

### Get Connection String

1. Click **Databases** → Your cluster
2. Click **Connect**
3. Select **Drivers** → **Node.js**
4. Copy the connection string
5. Replace `<password>` with your database user password
6. Replace `myFirstDatabase` with `geo-db`

Example:
```
mongodb+srv://geo_user:YourPasswordHere@cluster0.abc123.mongodb.net/geo-db?retryWrites=true&w=majority
```

---

## Step 3: Deploy Backend to Vercel

### Install Vercel CLI

```bash
npm install -g [email protected]
```

### Login to Vercel

```bash
vercel login
```

### Deploy Backend

1. Navigate to backend directory:
```bash
cd backend-new
```

2. Initialize Vercel project:
```bash
vercel --prod
```

3. Choose project name: `geo-platform-backend`
4. Framework: Choose "Other"
5. Output directory: `dist`
6. Install dependencies: Yes

### Add Environment Variables in Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Select your `geo-platform-backend` project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```
NODE_ENV = production
PORT = 8000
MONGODB_URL = mongodb+srv://geo_user:PASSWORD@cluster0.abc123.mongodb.net/geo-db?retryWrites=true&w=majority
JWT_SECRET = your-super-secret-jwt-key-change-this
JWT_EXPIRY = 24h
GROQ_API_KEY = your-groq-api-key
GOOGLE_CLIENT_ID = your-google-client-id
GOOGLE_CLIENT_SECRET = your-google-client-secret
GOOGLE_REDIRECT_URI = https://your-frontend-domain.vercel.app/auth/google/callback
LOG_LEVEL = info
CORS_ORIGIN = https://your-frontend-domain.vercel.app
RATE_LIMIT_WINDOW = 60000
RATE_LIMIT_MAX_REQUESTS = 100
```

5. Click **Save**

### Redeploy After Env Vars

```bash
vercel --prod
```

### Get Backend URL

After deployment, Vercel shows your URL like:
```
https://geo-platform-backend.vercel.app
```

Save this URL - you need it for frontend.

---

## Step 4: Prepare Frontend for Vercel

### Update Frontend API Base URL

Edit `GEO/src/utils/api.ts`:

```typescript
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function login(email: string, password: string) {
  const response = await axios.post(
    `${API_BASE_URL}/api/auth/login`,
    { email, password }
  );
  return response.data;
}

// All other API calls use API_BASE_URL
```

### Create `.env.production` in `GEO/`

```env
VITE_API_BASE_URL=https://geo-platform-backend.vercel.app
```

### Create `vercel.json` in `GEO/`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "routes": [
    {
      "src": "/",
      "dest": "/index.html"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

---

## Step 5: Deploy Frontend to Vercel

### Via Vercel Dashboard (Easiest)

1. Go to: https://vercel.com/dashboard
2. Click **Add New** → **Project**
3. Select GitHub repository: `SanjaiSrivatsan/GEO`
4. Framework: **Vite**
5. Root directory: `GEO`
6. Build command: `npm run build`
7. Output directory: `dist`
8. Install command: `npm install`
9. Click **Deploy**

### Via CLI

```bash
cd GEO
vercel --prod
```

Answer the prompts:
- Project name: `geo-platform`
- Framework: Vite
- Source: `./`
- Output directory: `dist`

---

## Step 6: Configure Google OAuth Redirect URI

1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Edit your OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   ```
   https://your-frontend-domain.vercel.app/auth/google/callback
   https://your-frontend-domain.vercel.app
   ```
6. Save

---

## Step 7: Add Environment Variables to Frontend

Frontend environment variables in Vercel Dashboard:

1. Go to `geo-platform` project (frontend)
2. **Settings** → **Environment Variables**
3. Add:

```
VITE_GOOGLE_CLIENT_ID = your-google-client-id
```

4. Click **Save**
5. Redeploy: `vercel --prod`

---

## Step 8: Test the Deployment

### Test Backend Endpoints

```bash
# Health check
curl https://geo-platform-backend.vercel.app/health

# Register
curl -X POST https://geo-platform-backend.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

### Test Frontend

1. Open in browser: `https://your-frontend-domain.vercel.app`
2. Register new account
3. Login
4. Create business profile
5. View GEO dashboard

---

## Step 9: Setup Custom Domain (Optional)

### Add Custom Domain to Frontend

1. In Vercel dashboard, go to your frontend project
2. **Settings** → **Domains**
3. Enter your custom domain
4. Update DNS records as shown by Vercel
5. Wait for SSL certificate (5-30 minutes)

### Update Google OAuth for Custom Domain

1. Update redirect URI in Google Cloud Console
2. Update `GOOGLE_REDIRECT_URI` in backend environment variables

---

## Complete Verification Checklist

✅ **Backend**
- [ ] Vercel build succeeds (Check Deployments tab)
- [ ] Health endpoint responds: `https://backend-url/health`
- [ ] MongoDB connection works
- [ ] Environment variables set correctly

✅ **Frontend**
- [ ] Vercel build succeeds
- [ ] Website loads without errors
- [ ] Can register and login
- [ ] Can create business profile
- [ ] Can view GEO dashboard
- [ ] All API calls succeed

✅ **Integration**
- [ ] Frontend connects to backend
- [ ] JWT tokens work correctly
- [ ] Google OAuth redirects work
- [ ] CORS headers correct

---

## Troubleshooting

### Issue: Backend Deployment Fails

**Check Build Logs**:
```bash
vercel logs -p geo-platform-backend
```

**Common Causes**:
1. Missing environment variables
2. TypeScript compilation errors
3. Missing packages in package.json

**Solution**:
```bash
cd backend-new
npm run build  # Test build locally
vercel deploy --prod
```

---

### Issue: Frontend Can't Connect to Backend

**Symptoms**: Network errors in browser console

**Solutions**:
1. Verify `VITE_API_BASE_URL` is correct
2. Check CORS_ORIGIN in backend environment variables
3. Ensure backend is running and responding
4. Check browser console for exact error

**Debug**:
```javascript
// In browser console
fetch('https://your-backend-url/health')
  .then(r => r.json())
  .then(d => console.log(d))
```

---

### Issue: MongoDB Connection Timeout

**Solutions**:
1. Check MongoDB Atlas whitelist includes Vercel IP
2. Verify connection string is correct
3. Ensure MongoDB cluster is running (not paused)
4. Check username and password in connection string

**Whitelist Vercel IPs**:
- Go to MongoDB Atlas → Network Access
- Add `0.0.0.0/0` (Allow from Anywhere) for testing
- For production, add specific IPs

---

### Issue: Google OAuth Not Working

**Solutions**:
1. Verify redirect URI matches exactly (including protocol)
2. Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
3. Ensure OAuth consent screen is configured
4. Verify custom domain if using one

---

### Issue: Rate Limiting Issues

**Solution**: Increase rate limit in backend env vars

```
RATE_LIMIT_MAX_REQUESTS = 1000
RATE_LIMIT_WINDOW = 60000
```

---

## Environment Variables Reference

### Backend (backend-new)

| Variable | Example | Required |
|----------|---------|----------|
| NODE_ENV | production | Yes |
| MONGODB_URL | mongodb+srv://... | Yes |
| JWT_SECRET | your-secret-key | Yes |
| JWT_EXPIRY | 24h | Yes |
| GROQ_API_KEY | gsk_... | Yes |
| GOOGLE_CLIENT_ID | ... | Yes |
| GOOGLE_CLIENT_SECRET | ... | Yes |
| GOOGLE_REDIRECT_URI | https://domain/callback | Yes |
| CORS_ORIGIN | https://domain | Yes |
| LOG_LEVEL | info | No |
| RATE_LIMIT_WINDOW | 60000 | No |
| RATE_LIMIT_MAX_REQUESTS | 100 | No |

### Frontend (GEO)

| Variable | Example | Required |
|----------|---------|----------|
| VITE_API_BASE_URL | https://backend-url | Yes |
| VITE_GOOGLE_CLIENT_ID | ... | Yes |

---

## Performance Optimization

### Backend Optimizations

1. **Enable Response Compression**:
```typescript
import compression from 'compression';
app.use(compression());
```

2. **Add Request Timeout**:
```typescript
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  next();
});
```

3. **Database Connection Pooling**: MongoDB Atlas handles this automatically

### Frontend Optimizations

1. **Code Splitting**:
```typescript
const Dashboard = lazy(() => import('./pages/GeoDashboardPage'));
```

2. **Image Optimization**:
```typescript
import { Image } from 'lucide-react';
// Use WebP format when possible
```

3. **Build Optimization**:
```bash
npm run build -- --minify terser --analyze
```

---

## Monitoring & Logs

### View Backend Logs

```bash
vercel logs -p geo-platform-backend --tail
```

### View Frontend Build Logs

In Vercel Dashboard:
1. Select frontend project
2. **Deployments** tab
3. Click latest deployment
4. Click **Logs** tab

### Monitor Performance

1. Go to Vercel Dashboard
2. Select your project
3. **Analytics** tab shows:
   - Response times
   - Error rates
   - Bandwidth usage

---

## Database Backup

### MongoDB Atlas Auto Backups

Enabled by default on M2+ tier. Free M0 tier requires:

1. Export method: Use MongoDB Atlas tools
2. Schedule: Manual export or use script

### Manual Backup Command

```bash
mongodump --uri="your-connection-string" --out=./backup
```

---

## Scaling Considerations

### Current Setup (Free Tier)

- **Frontend**: 100 GB/month bandwidth free
- **Backend**: 12 serverless function invocations/second
- **Database**: M0 (512 MB) free tier

### When to Upgrade

1. **Frontend**: Upgrade to Pro when > 100 GB bandwidth
2. **Backend**: Upgrade functions when > 12 req/sec
3. **Database**: Upgrade MongoDB to M2+ at 512 MB limit

### Upgrade Database to M2

1. MongoDB Atlas → Cluster → Configuration
2. Change tier to M2 ($9/month)
3. Existing data migrates automatically

---

## Security Checklist

✅ **Secrets Management**
- [ ] All secrets in environment variables (not in code)
- [ ] Never commit `.env` files
- [ ] Rotate JWT_SECRET periodically
- [ ] Use strong database passwords

✅ **API Security**
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] JWT validation on all protected routes
- [ ] Input validation with Zod

✅ **Database Security**
- [ ] MongoDB whitelist configured
- [ ] Database user has minimal permissions
- [ ] TLS/SSL enabled
- [ ] Regular backups enabled

✅ **OAuth Security**
- [ ] Redirect URIs match exactly
- [ ] HTTPS only for OAuth
- [ ] Client secret never exposed

---

## Deployment Commands Reference

```bash
# Install Vercel CLI
npm install -g [email protected]

# Login to Vercel
vercel login

# Deploy backend
cd backend-new
vercel --prod

# Deploy frontend
cd GEO
vercel --prod

# View logs
vercel logs -p project-name

# View environment variables
vercel env list

# Pull environment variables
vercel env pull

# List deployed projects
vercel projects list
```

---

## Production Checklist

Before going live:

- [ ] All environment variables set
- [ ] Database backups configured
- [ ] SSL certificate installed (auto on custom domain)
- [ ] CORS properly configured
- [ ] Rate limiting appropriate
- [ ] Monitoring/alerts setup
- [ ] Error tracking setup (Sentry recommended)
- [ ] Performance tested
- [ ] Security audit completed
- [ ] Documentation up to date

---

## Next Steps After Deployment

1. **Setup Error Tracking**: Integrate Sentry for bug tracking
2. **Setup Analytics**: Add Google Analytics to track usage
3. **Setup Monitoring**: Use Vercel's built-in monitoring
4. **Setup Alerting**: Get notified of failures
5. **Document API**: Use Postman or similar
6. **Setup CI/CD**: Auto-deploy on git push
7. **Plan Scaling**: Monitor and upgrade as needed

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com
- **Express.js Docs**: https://expressjs.com
- **React Docs**: https://react.dev

---

**Deployment Date**: [Your Date]
**Status**: Ready for production
**Last Updated**: April 22, 2026
