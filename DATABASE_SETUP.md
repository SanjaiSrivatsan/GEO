# Database Setup Guide - GEO Platform

Complete instructions for setting up MongoDB for local development and production deployment on Vercel.

---

## Table of Contents

1. [Local MongoDB Setup](#local-mongodb-setup)
2. [MongoDB Atlas Cloud Setup](#mongodb-atlas-cloud-setup)
3. [Connection Strings](#connection-strings)
4. [Database Configuration](#database-configuration)
5. [Offline Mode](#offline-mode)
6. [Database Models](#database-models)
7. [Initial Data](#initial-data)
8. [Backup & Restore](#backup--restore)
9. [Troubleshooting](#troubleshooting)

---

## Local MongoDB Setup

### Windows Installation

#### **Option 1: MongoDB Community Edition (Recommended)**

1. **Download MongoDB**
   - Go to: https://www.mongodb.com/try/download/community
   - Select:
     - Version: **Latest (7.0+)**
     - OS: **Windows (msi)**
     - Package: **Windows Server 2019+**
   - Download the `.msi` installer

2. **Install MongoDB**
   - Run the installer
   - Choose **Complete** installation
   - Check **Install as a Service**
   - Check **Run MongoDB as a Service**
   - Click **Install**

3. **Verify Installation**
   ```bash
   mongod --version
   # Output: db version v7.0.0
   ```

4. **Start MongoDB Service**
   ```bash
   # Start service
   net start MongoDB

   # Or use Services app:
   # Press Win+R → services.msc → Find MongoDB → Start
   ```

5. **Connect to MongoDB**
   ```bash
   mongosh
   # Or: mongo

   # Should see: MongoDB shell version
   ```

#### **Option 2: Docker (Advanced)**

```bash
# Pull MongoDB image
docker pull mongo:latest

# Run MongoDB container
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:latest

# Verify
docker ps | grep mongodb
```

### macOS Installation

```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start service
brew services start mongodb-community

# Verify
mongosh
```

### Linux Installation (Ubuntu 20+)

```bash
# Add MongoDB repository
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
apt-get update
apt-get install -y mongodb-org

# Start service
systemctl start mongod
systemctl enable mongod

# Verify
mongosh
```

---

## MongoDB Atlas Cloud Setup

### Step-by-Step Setup

#### **1. Create MongoDB Atlas Account**

1. Go to: https://www.mongodb.com/cloud/atlas
2. Click **Sign Up**
3. Fill in:
   - Email: Your email
   - Password: Strong password
   - Confirm password
4. Click **Sign Up**
5. Verify email address

#### **2. Create Organization & Project**

1. Click **Create an organization**
2. Organization name: `GEO Platform`
3. Create a **New Project** within organization
4. Project name: `GEO Development`
5. Click **Create Project**

#### **3. Create Database Cluster**

1. Click **Create a Database** or **Build a Cluster**
2. Select cluster tier:
   - **M0 (Free)** ✅ Perfect for development
     - 512 MB storage
     - Shared RAM
     - No backups
     - No availability zones
3. Cloud provider: **AWS** (or your preference)
4. Region: Choose closest to you
   - US East (N. Virginia)
   - EU (Frankfurt)
   - Asia Pacific (Singapore)
5. Cluster name: `geo-cluster`
6. Click **Create**

**Wait 10-15 minutes** for cluster to provision.

#### **4. Create Database User**

1. In MongoDB Atlas Dashboard, click **Database**
2. Go to **Security** → **Database Access**
3. Click **Add New Database User**
4. Fill in:
   - **Username**: `geo_user`
   - **Password**: Use **Autogenerate Secure Password** (copy it!)
   - **Built-in Role**: `Atlas Admin`
5. Click **Add User**

**Save this password!** You'll need it for connection string.

#### **5. Whitelist IP Address**

1. Go to **Security** → **Network Access**
2. Click **Add IP Address**
3. For development/testing:
   - Click **Allow Access from Anywhere**
   - IP: `0.0.0.0/0`
   - Description: "Dev/Test Access"
4. For production:
   - Enter specific IP addresses of your servers
   - Example Vercel IPs: 162.142.125.138, 162.142.126.177, etc.
5. Click **Confirm**

#### **6. Get Connection String**

1. Click your cluster → **Connect**
2. Choose connection method: **Drivers**
3. Driver: **Node.js** | Version: **5.8+**
4. Copy the connection string:

```
mongodb+srv://geo_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

5. Replace `<password>` with your saved password

#### **7. Create Database and Collections**

1. Click **Collections**
2. Click **Create Database**
3. Database name: `geo-db`
4. Collection name: `users` (or skip, Mongoose creates automatically)
5. Click **Create**

### Test Connection

```bash
# Using mongosh CLI
mongosh "mongodb+srv://geo_user:PASSWORD@cluster0.xxxxx.mongodb.net/geo-db"

# Or in Node.js app
# Add MONGODB_URL to .env
```

---

## Connection Strings

### Local Development

```env
# .env (local MongoDB)
MONGODB_URL=mongodb://localhost:27017/geo-db

# Or with authentication
MONGODB_URL=mongodb://admin:password@localhost:27017/geo-db?authSource=admin
```

### MongoDB Atlas (Cloud)

```env
# .env (MongoDB Atlas)
MONGODB_URL=mongodb+srv://geo_user:PASSWORD@cluster0.xxxxx.mongodb.net/geo-db?retryWrites=true&w=majority
```

### Connection String Format

```
mongodb+srv://[username]:[password]@[cluster].[provider].mongodb.net/[database]?[options]
```

**Components**:
- `username`: `geo_user`
- `password`: Your database user password
- `cluster`: `cluster0.abc123` (from Atlas)
- `database`: `geo-db`
- `options`: Retry and consistency settings

### Vercel Environment Variable

```env
MONGODB_URL=mongodb+srv://geo_user:YOUR_PASSWORD@cluster0.abc123.mongodb.net/geo-db?retryWrites=true&w=majority
```

---

## Database Configuration

### Backend Connection Setup

**File**: `backend-new/src/config/database.ts`

```typescript
import mongoose from 'mongoose';
import logger from './logger.js';

const config = {
  mongodbUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/geo-db',
  nodeEnv: process.env.NODE_ENV || 'development'
};

export async function connectDB(): Promise<void> {
  try {
    // Timeout protection - 5 seconds
    const connectionPromise = mongoose.connect(config.mongodbUrl, {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
      socketTimeoutMS: 5000
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('MongoDB connection timeout (5s)')),
        5000
      )
    );

    await Promise.race([connectionPromise, timeoutPromise]);
    logger.info('✅ MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    throw error;
  }
}

export default connectDB;
```

### Server Initialization

**File**: `backend-new/src/server.ts`

```typescript
import connectDB from './config/database.js';
import logger from './config/logger.js';

async function startServer() {
  try {
    // Attempt MongoDB connection
    try {
      await connectDB();
    } catch (dbError) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn('⚠️ MongoDB unavailable - running in offline mode');
        logger.warn('Some features will not work until MongoDB is available');
      } else {
        // Production: fail if no database
        throw dbError;
      }
    }

    // Start Express app
    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
```

### Mongoose Model Example

**File**: `backend-new/src/models/User.ts`

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    is_active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Indexes for performance
userSchema.index({ email: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
```

---

## Offline Mode

### What Works in Offline Mode

✅ Server starts without MongoDB
✅ API endpoints exist
✅ In-memory operations work
✅ Request logging works
✅ Error handling works

### What Doesn't Work

❌ Database queries return empty
❌ User registration fails
❌ Business profiles can't save
❌ Any data persistence

### Enable Offline Mode

**For Development**:
```env
NODE_ENV=development
# MongoDB connection will be attempted but not required
```

**For Testing**:
```bash
# Don't set MONGODB_URL
# Server will start in offline mode
npm run dev
```

### Check Connection Status

```bash
# Test MongoDB connection
curl http://localhost:8000/health
# Response: {"status":"ok","mongodb":true/false}
```

---

## Database Models

### All 16 Models

1. **User** - User accounts and authentication
2. **BusinessProfile** - Business information
3. **CrawlStatus** - Website crawl tracking
4. **WebsiteContent** - Crawled website data
5. **GoogleBusinessProfile** - Google Profile OAuth
6. **GoogleLocation** - Google Business locations
7. **GoogleReview** - Google reviews data
8. **BrandMention** - Social/news mentions
9. **GeoScore** - Calculated visibility scores
10. **GapIssue** - Detected visibility gaps
11. **GeoPrompt** - LLM prompt results
12. **GeoResponse** - Combined analysis results
13. **CanonicalEntity** - Synthesized entity data
14. **ReinforcementTask** - Improvement tasks
15. **SimulationRun** - Score projections
16. **ReasoningAnalysis** - Change analysis

### Initialize Models

Models auto-create on first use if collections don't exist:

```typescript
// Import all models
import { User } from './models/User.js';
import { BusinessProfile } from './models/BusinessProfile.js';
import { GeoScore } from './models/GeoScore.js';
// ... etc

// Models register with MongoDB automatically
// No manual table creation needed
```

### Useful Mongoose Commands

```javascript
// Test connection
mongosh
> use geo-db
> db.users.find()

// Drop collection
> db.users.deleteMany({})

// Get statistics
> db.stats()

// Create index
> db.users.createIndex({email: 1})
```

---

## Initial Data

### Seed Database

Create `backend-new/scripts/seedDatabase.ts`:

```typescript
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { AuthService } from '../src/services/AuthService.js';

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/geo-db');

    // Create test user
    const testUser = await User.findOne({ email: 'test@example.com' });

    if (!testUser) {
      const hashedPassword = await AuthService.hashPassword('TestPassword123!');
      const user = new User({
        email: 'test@example.com',
        password: hashedPassword,
        is_active: true
      });
      await user.save();
      console.log('✅ Test user created');
    }

    console.log('✅ Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
```

Run seed:
```bash
npm run seed
# Or: npx ts-node scripts/seedDatabase.ts
```

---

## Backup & Restore

### Local Backup

```bash
# Backup database
mongodump --uri="mongodb://localhost:27017/geo-db" --out=./backups/geo-backup-$(date +%Y%m%d)

# Restore database
mongorestore --uri="mongodb://localhost:27017/geo-db" ./backups/geo-backup-20260422
```

### MongoDB Atlas Backup

1. Go to **Backup** tab in MongoDB Atlas
2. **Automated Backups** (M2+ tier only)
   - Daily snapshots retained 7 days
   - For M0 tier: Use manual backups or export

3. **Manual Backup**
   - Click **Take Snapshot**
   - Restores to new cluster
   - Download BSON/CSV

### Export Data

```bash
# Export to JSON
mongoexport --uri="mongodb+srv://user:pass@cluster0.xxx.mongodb.net/geo-db" \
  --collection=users \
  --out=users.json --jsonArray

# Import from JSON
mongoimport --uri="mongodb+srv://user:pass@cluster0.xxx.mongodb.net/geo-db" \
  --collection=users \
  --file=users.json --jsonArray
```

---

## Troubleshooting

### Issue: "MongoDB connection refused"

**Cause**: MongoDB isn't running

**Solution**:
```bash
# Windows
net start MongoDB
# Or open Services → MongoDB → Start

# macOS
brew services start mongodb-community

# Linux
systemctl start mongod
```

---

### Issue: "Authentication failed"

**Cause**: Wrong username/password or wrong database

**Check**:
1. Username matches (default: `geo_user`)
2. Password is correct (saved from Atlas)
3. Database name is `geo-db`
4. Connection string format is correct

**Example correct string**:
```
mongodb+srv://geo_user:MyPassword123@cluster0.abc123.mongodb.net/geo-db
```

---

### Issue: "Connection timeout after 5 seconds"

**Cause**: MongoDB Atlas IP not whitelisted

**Solution**:
1. Go to MongoDB Atlas → Network Access
2. Click **Add IP Address**
3. For testing: Add `0.0.0.0/0` (Allow from Anywhere)
4. For production: Add specific IPs

---

### Issue: "E11000 duplicate key error"

**Cause**: Unique field has duplicate values

**Solution**:
```bash
# Drop collection and recreate
mongosh
> use geo-db
> db.users.drop()
# Data will recreate on next insert
```

---

### Issue: "MongoNetworkError: failed to connect"

**Causes**:
1. MongoDB server not running
2. Wrong connection string
3. Firewall blocking port 27017
4. IP not whitelisted (Atlas)

**Debug**:
```bash
# Test local connection
mongosh "mongodb://localhost:27017/geo-db"

# Test Atlas connection
mongosh "mongodb+srv://geo_user:PASSWORD@cluster0.xxx.mongodb.net/geo-db"
```

---

### Issue: "Command timeout - took 30000 ms"

**Cause**: Network latency or slow query

**Solution**:
1. Increase timeout in connection string:
```
mongodb+srv://geo_user:pass@cluster0.xxx.mongodb.net/geo-db?serverSelectionTimeoutMS=10000&socketTimeoutMS=10000
```

2. Or reduce data sample size in queries

---

### Issue: "M0 cluster paused"

**Cause**: Free M0 cluster auto-pauses after 7 days of inactivity

**Solution**:
1. Go to MongoDB Atlas
2. Click your cluster → **Pause/Resume**
3. Click **Resume**
4. Wait 2-3 minutes for restart

---

## Production Checklist

Before deploying to Vercel:

✅ **Local Testing**
- [ ] MongoDB runs locally
- [ ] Backend connects successfully
- [ ] Can create/read data
- [ ] No connection errors in logs

✅ **MongoDB Atlas Setup**
- [ ] Organization created
- [ ] M0 cluster provisioned
- [ ] Database user created (`geo_user`)
- [ ] IP whitelist configured
- [ ] Connection string saved

✅ **Connection String**
- [ ] Format: `mongodb+srv://geo_user:PASSWORD@cluster0.xxx.mongodb.net/geo-db`
- [ ] Password is URL-encoded (if special chars)
- [ ] Database name is `geo-db`
- [ ] No leading/trailing spaces

✅ **Vercel Environment**
- [ ] `MONGODB_URL` set in Vercel dashboard
- [ ] No hardcoded credentials in code
- [ ] Connection tested in production build

✅ **Security**
- [ ] Database user password strong
- [ ] IP whitelist appropriate
- [ ] Never share connection string
- [ ] Rotate password regularly

---

## Quick Reference

### Start MongoDB

```bash
# Windows Service
net start MongoDB

# Docker
docker start mongodb

# Manual
mongod --dbpath /path/to/data

# macOS
brew services start mongodb-community
```

### Connect to Database

```bash
# Local
mongosh mongodb://localhost:27017/geo-db

# Atlas
mongosh "mongodb+srv://geo_user:PASSWORD@cluster0.xxx.mongodb.net/geo-db"
```

### Backend Env Var

```env
MONGODB_URL=mongodb+srv://geo_user:PASSWORD@cluster0.xxx.mongodb.net/geo-db?retryWrites=true&w=majority
NODE_ENV=production
```

### Test Connection

```bash
curl http://localhost:8000/health
# Response: {"status":"ok",...}
```

---

## Support

- **MongoDB Docs**: https://docs.mongodb.com
- **Mongoose Docs**: https://mongoosejs.com
- **MongoDB Atlas Help**: https://support.mongodb.com
- **Troubleshoot**: https://docs.mongodb.com/manual/reference/connection-string-errors/

---

**Last Updated**: April 22, 2026
**Version**: 1.0.0
**Status**: ✅ Production Ready
