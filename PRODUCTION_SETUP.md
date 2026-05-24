# 🚀 GEO Engine - Production Setup Guide

## 📋 Required API Keys & Credentials

### 1. **Google OAuth 2.0** (For Google Business Profile Integration)
**Status**: ⏳ NEEDED FOR PRODUCTION
**Where to get**:
- Go to: https://console.cloud.google.com/
- Create a new project
- Enable Google+ API
- Create OAuth 2.0 Client ID (Web application)

**You will receive**:
- CLIENT_ID
- CLIENT_SECRET
- REDIRECT_URI (set to `https://yourdomain.com/api/google/oauth/callback`)

**What it enables**:
- ✅ Connect Google Business Profile
- ✅ Fetch locations and reviews
- ✅ User-specific Google data

---

### 2. **MongoDB Atlas** (Production Database)
**Status**: ⏳ NEEDED FOR PRODUCTION
**Where to get**:
- Go to: https://www.mongodb.com/cloud/atlas
- Create free account
- Create a cluster
- Get connection string

**You will receive**:
- MONGODB_URI (looks like: `mongodb+srv://user:password@cluster.mongodb.net/geo_db?retryWrites=true&w=majority`)

**What it enables**:
- ✅ Production database
- ✅ Cloud-based data storage
- ✅ Auto backups

---

### 3. **OpenAI API** (For LLM Prompt Execution)
**Status**: ⏳ NEEDED FOR PRODUCTION
**Where to get**:
- Go to: https://platform.openai.com/
- Sign up / Login
- Create API key
- Set up billing

**You will receive**:
- OPENAI_API_KEY (format: `sk-proj-...`)

**What it enables**:
- ✅ Execute GEO prompts
- ✅ AI-powered analysis
- ✅ Intelligence engine features

---

### 4. **Google Custom Search API** (For Brand Mention Discovery)
**Status**: ⏳ NEEDED FOR PRODUCTION
**Where to get**:
- Go to: https://console.cloud.google.com/
- (Same project as #1)
- Enable "Custom Search API"
- Go to: https://cse.google.com/cse/
- Create a custom search engine
- Get Search Engine ID

**You will receive**:
- GOOGLE_CSE_API_KEY (from GCP)
- GOOGLE_CSE_ID (from Custom Search)

**What it enables**:
- ✅ Brand mention discovery
- ✅ Web search integration
- ✅ Mention evidence gathering

---

### 5. **Google Business Profile API** (For Location Data)
**Status**: ⏳ NEEDED FOR PRODUCTION
**Where to get**:
- Same as #1 and #4 (GCP project)
- Enable "Google Business Profile API"
- Get API key

**You will receive**:
- Covered by GOOGLE_API_KEY

**What it enables**:
- ✅ Fetch GBP locations
- ✅ Get business reviews
- ✅ Location metadata

---

### 6. **YouTube Data API** (Optional - For BIS Feature)
**Status**: ⏳ OPTIONAL FOR ADVANCED FEATURES
**Where to get**:
- https://console.cloud.google.com/
- Enable "YouTube Data API v3"
- Create API key

**You will receive**:
- YOUTUBE_API_KEY

**What it enables**:
- ✅ BIS YouTube mention scanning (optional)

---

### 7. **NewsAPI** (Optional - For BIS Feature)
**Status**: ⏳ OPTIONAL FOR ADVANCED FEATURES
**Where to get**:
- Go to: https://newsapi.org/
- Create account
- Get API key

**You will receive**:
- NEWS_API_KEY

**What it enables**:
- ✅ BIS news mention scanning (optional)

---

## 🔧 Environment Configuration

Create `.env.production` file with:

```env
# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/geo_db?retryWrites=true&w=majority

# Server
PORT=8000
NODE_ENV=production

# JWT
JWT_SECRET=<generate-secure-256-bit-hex>
JWT_EXPIRE_IN=1440m

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/google/oauth/callback

# Google APIs
GOOGLE_API_KEY=your-google-api-key
GOOGLE_CSE_API_KEY=your-cse-api-key
GOOGLE_CSE_ID=your-search-engine-id

# OpenAI
OPENAI_API_KEY=sk-proj-your-key

# Optional APIs
YOUTUBE_API_KEY=your-youtube-api-key
NEWS_API_KEY=your-news-api-key

# CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Logging
LOG_LEVEL=info
```

---

## ✅ What's Already Ready for Production

1. ✅ **Express.js Server** - Production-grade
2. ✅ **Mongoose + MongoDB** - Ready for any database
3. ✅ **JWT Authentication** - Secure token handling
4. ✅ **Error Handling** - Global error middleware
5. ✅ **CORS** - Configurable origins
6. ✅ **TypeScript** - Type safety
7. ✅ **All 48 Endpoints** - Fully implemented
8. ✅ **All 13 Services** - Complete business logic
9. ✅ **Logging** - Winston configured
10. ✅ **Tests** - Test suite included

---

## 🚀 Deployment Options

### Option 1: Heroku (Easiest)
```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set MONGODB_URI=...
heroku config:set OPENAI_API_KEY=...
# ... set all vars

# Deploy
git push heroku main
```

### Option 2: AWS (Most Flexible)
- EC2 for backend
- RDS for database
- Environment variables in AWS Systems Manager

### Option 3: Docker + Any Cloud
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY dist/ ./dist/
CMD ["node", "dist/index.js"]
```

### Option 4: Railway/Render (Simple)
- Connect GitHub repo
- Set environment variables
- Auto-deploy on push

---

## 🧪 Production Testing Checklist

- [ ] All 48 endpoints tested with real APIs
- [ ] Google OAuth flow works end-to-end
- [ ] Website crawling working
- [ ] Mention discovery returning real results
- [ ] LLM prompts executing and returning results
- [ ] Intelligence engine generating analyses
- [ ] BIS scans completing successfully
- [ ] Frontend connecting to backend
- [ ] Error handling working correctly
- [ ] Database operations persisting data
- [ ] JWT tokens expiring correctly
- [ ] Rate limiting configured (optional)
- [ ] Logging capturing all events
- [ ] Database backups configured
- [ ] SSL/HTTPS enabled
- [ ] Monitoring/alerting set up

---

## 🔒 Security Checklist

- [ ] All API keys stored in environment variables (never in code)
- [ ] CORS origins whitelist configured
- [ ] HTTPS enforced
- [ ] JWT secret is cryptographically secure
- [ ] Database requires authentication
- [ ] Sensitive data not logged
- [ ] Input validation on all endpoints
- [ ] Rate limiting implemented
- [ ] CSRF protection if needed
- [ ] Regular security updates for dependencies

---

## 📞 Next Steps

1. ✅ Provide API keys (from above)
2. ✅ Configure environment variables
3. ✅ Test each service with real APIs
4. ✅ Deploy to production
5. ✅ Monitor and maintain

---

**Let me know what API keys you have and I'll wire everything up!**
