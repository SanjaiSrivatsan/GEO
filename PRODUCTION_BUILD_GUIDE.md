# PRODUCTION BUILD & DEPLOYMENT GUIDE

## Quick Start - Build for Production

### Prerequisites

- Node.js v18.0.0 or higher
- MongoDB v4.4+ (local or Atlas)
- npm v8.0.0+

### Step 1: Prepare Backend for Production

```bash
cd "D:\Internship Works\FINAL GEO IMPLEMENTATION\backend-new"

# 1. Install dependencies
npm install --production

# 2. Create production .env file
cp .env.example .env.production

# Edit .env.production and set:
# - NODE_ENV=production
# - MONGODB_URL to your production database
# - JWT_SECRET to a secure random string (use: openssl rand -base64 32)
# - CORS_ORIGINS to your production domain
# - All API keys for external services

# 3. Build TypeScript
npm run build

# 4. Verify build
ls -la dist/server.js

# Expected: dist/server.js exists and is > 50KB
```

### Step 2: Prepare Frontend for Production

```bash
cd "D:\Internship Works\FINAL GEO IMPLEMENTATION\GEO"

# 1. Install dependencies
npm install --production

# 2. Update API base URL
# Edit src/utils/api.ts
# Change: const API_BASE_URL = "http://localhost:8000/api";
# To: const API_BASE_URL = "https://api.yourdomain.com/api";

# 3. Build frontend
npm run build

# 4. Verify build
ls -la dist/

# Expected: dist/ folder contains index.html and assets folder
```

### Step 3: Test Production Build Locally

```bash
# Terminal 1 - Backend
cd backend-new
NODE_ENV=production node dist/server.js

# Terminal 2 - Frontend
cd GEO
npm run preview  # or deploy dist/ to a local server

# Test: http://localhost:4173 (or your server)
```

---

## Deployment Strategies

### Option 1: Heroku (Simple, Recommended for MVP)

#### Backend Deployment

```bash
cd backend-new

# 1. Create Heroku app
heroku create geo-api-production

# 2. Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/geo
heroku config:set JWT_SECRET=$(openssl rand -base64 32)

# 3. Deploy
git push heroku main

# 4. View logs
heroku logs --tail
```

#### Frontend Deployment (Vercel)

```bash
cd GEO

# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel --prod

# 3. Set API environment variable
vercel env add API_BASE_URL https://geo-api-production.herokuapp.com/api

# 4. Redeploy with new env
vercel --prod
```

---

### Option 2: AWS (Scalable)

#### Backend on EC2

```bash
# 1. SSH into EC2 instance
ssh -i your-key.pem ec2-user@your-instance.com

# 2. Install Node.js
curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install nodejs

# 3. Clone repository
git clone <your-repo>
cd "Final GEO IMPLEMENTATION/backend-new"

# 4. Install and build
npm install --production
npm run build

# 5. Install PM2 for process management
npm install -g pm2

# 6. Start backend with PM2
pm2 start dist/server.js --name "geo-api"
pm2 startup
pm2 save

# 7. Set up nginx as reverse proxy
# /etc/nginx/conf.d/geo.conf
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 8. Start nginx
sudo systemctl start nginx
```

#### Frontend on CloudFront + S3

```bash
# 1. Build frontend
cd GEO
npm run build

# 2. Upload dist/ to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR-DIST-ID --paths "/*"
```

---

### Option 3: Docker (Production-Grade)

#### Dockerfile - Backend

```dockerfile
# Multi-stage build
FROM node:18-alpine as builder
WORKDIR /app
COPY backend-new/package*.json ./
RUN npm ci --production

# Build stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY backend-new/dist ./dist
COPY backend-new/.env.production ./.env

ENV NODE_ENV=production
EXPOSE 8000

CMD ["node", "dist/server.js"]
```

#### docker-compose.yml

```yaml
version: "3.8"

services:
  mongodb:
    image: mongo:5.0
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}

  api:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    environment:
      NODE_ENV: production
      MONGODB_URL: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/geo
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - mongodb
    restart: always

  web:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:80"
    depends_on:
      - api
    restart: always

volumes:
  mongodb_data:
```

#### Deploy with Docker

```bash
# 1. Build images
docker-compose build

# 2. Start services
docker-compose up -d

# 3. View logs
docker-compose logs -f

# 4. Stop services
docker-compose down
```

---

### Option 4: DigitalOcean App Platform (Easy)

```bash
# 1. Push to GitHub (if not already)
git push origin main

# 2. Connect DigitalOcean App Platform
# - Go to DigitalOcean Dashboard
# - Select App Platform
# - Connect GitHub repository
# - Auto-detect and configure services
# - Set environment variables
# - Deploy

# 3. Access your app at: https://your-app-name-xxxxx.ondigitalocean.app
```

---

## Environment Variables for Production

### Required Variables

```bash
# Server
NODE_ENV=production
PORT=8000
HOST=0.0.0.0

# Database
MONGODB_URL=mongodb+srv://user:password@cluster0.mongodb.net/geo-db?retryWrites=true&w=majority

# Security
JWT_SECRET=<32+ character random string from: openssl rand -base64 32>
BCRYPT_ROUNDS=10

# Frontend
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com

# Logging
DEBUG=false
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=100
```

### Optional (for full features)

```bash
# LLM
GROQ_API_KEY=your-groq-api-key

# Google Integration
GOOGLE_CSE_API_KEY=your-google-cse-key
GOOGLE_CSE_ID=your-search-engine-id
GOOGLE_OAUTH_CLIENT_ID=your-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret

# News & Social
YOUTUBE_API_KEY=your-youtube-key
NEWS_API_KEY=your-newsapi-key

# Monitoring (Optional)
SENTRY_DSN=your-sentry-dsn (for error tracking)
```

---

## SSL/TLS Configuration

### Let's Encrypt (Free)

```bash
# 1. Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# 2. Get certificate
sudo certbot certonly --nginx -d api.yourdomain.com

# 3. Update nginx to use SSL
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # Rest of config...
}

# 4. Auto-renew
sudo systemctl enable certbot.timer
```

---

## Database Backup Strategy

### MongoDB Atlas (Managed)

```bash
# Backups are automatic with MongoDB Atlas
# - Retain for 7 days by default
# - Incremental snapshots every 6 hours
# - Point-in-time recovery available
$
# To restore:
# 1. Go to MongoDB Atlas Dashboard
# 2. Database → Backup
# 3. Click "Restore" on desired backup
```

### Self-hosted MongoDB

```bash
# Automated daily backup
# crontab -e
0 2 * * * /backup-mongo.sh

# Backup script: /backup-mongo.sh
#!/bin/bash
DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/backups/mongodb"
mkdir -p $BACKUP_DIR

mongodump --uri="mongodb://user:pass@localhost:27017/geo" \
  --out=$BACKUP_DIR/backup-$DATE

# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;
```

---

## Monitoring & Alerts

### Health Check Endpoint

```bash
# Monitor this endpoint every 5 minutes
curl -X GET https://api.yourdomain.com/api/health

# Expected response:
{
  "status": "ok",
  "uptime": 3600,
  "database": {
    "connected": true,
    "responseTime": 2.5
  }
}
```

### Error Tracking (Sentry)

```bash
# 1. Create Sentry account at https://sentry.io
# 2. Create project for geo-backend
# 3. Get your DSN
# 4. Set in .env: SENTRY_DSN=https://xxx@sentry.io/xxx
# 5. Backend will automatically report errors
```

### Logging

```bash
# View backend logs
docker-compose logs api

# Or on EC2:
pm2 logs geo-api

# Or on Heroku:
heroku logs --tail
```

---

## Performance Optimization Checklist

- [ ] Enable gzip compression in nginx
- [ ] Set up CDN for static assets
- [ ] Configure Redis for session caching
- [ ] Implement database query optimization
- [ ] Set up load balancing for multiple instances
- [ ] Configure auto-scaling policies
- [ ] Enable HTTP/2 on all connections
- [ ] Implement rate limiting appropriately
- [ ] Set up database connection pooling
- [ ] Monitor and optimize slow queries

---

## Security Hardening Checklist

- [ ] Update all dependencies: `npm audit fix`
- [ ] Rotate JWT_SECRET regularly
- [ ] Enable database authentication
- [ ] Use strong MongoDB user passwords
- [ ] Configure firewall rules
- [ ] Enable SSL/TLS for all connections
- [ ] Set HTTPS-only cookies
- [ ] Enable HSTS headers
- [ ] Configure CSRF tokens
- [ ] Set up DDoS protection (Cloudflare)
- [ ] Regular security audits
- [ ] Monitor failed login attempts
- [ ] Implement rate limiting
- [ ] Keep Node.js and dependencies updated

---

## Rollback Procedure

### If Deployment Fails

```bash
# Option 1: Using git tags
git checkout v1.0.0-production  # Previous working version
npm install
npm run build
npm start

# Option 2: Using docker
docker pull myregistry/geo-api:v1.0.0
docker run -d myregistry/geo-api:v1.0.0

# Option 3: Using Heroku
heroku releases
heroku rollback v3  # Rollback to previous version

# Option 4: PM2
pm2 revert geo-api
```

---

## Post-Deployment Verification

```bash
# 1. Check backend health
curl -X GET https://api.yourdomain.com/api/health

# 2. Test auth flow
curl -X POST https://api.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@"}'

# 3. Check frontend loads
curl -X GET https://yourdomain.com

# 4. Check CORS headers
curl -I -X OPTIONS https://api.yourdomain.com/api/health \
  -H "Origin: https://yourdomain.com"

# 5. Monitor logs for errors
# Check Sentry dashboard or PM2 logs

# 6. Performance test
# Use: ab, wrk, or k6 for load testing
ab -n 100 -c 10 https://api.yourdomain.com/api/health
```

---

## Support & Troubleshooting

### Common Issues

**Backend won't start**

```bash
# Check port is available
lsof -i :8000

# Check MongoDB connection
mongosh "mongodb+srv://..." --eval "db.adminCommand('ping')"

# Check env variables
printenv | grep MONGODB
```

**High memory usage**

```bash
# Check Node.js memory
pm2 monit

# Check database connection pool
# Adjust in config: maxPoolSize=50
```

**Slow API responses**

```bash
# Check database performance
mongosh
use geo
db.businessprofiles.find().explain("executionStats")

# Add indexes if needed
db.businessprofiles.createIndex({ "userId": 1, "createdAt": -1 })
```

---

## Maintenance Schedule

- **Daily**: Monitor alerts and errors
- **Weekly**: Review logs and performance metrics
- **Monthly**: Security updates and dependency audit
- **Quarterly**: Database optimization and cleanup
- **Yearly**: Major version upgrades and architectural review

---

Generated: 2026-04-18
Status: PRODUCTION READY ✓
