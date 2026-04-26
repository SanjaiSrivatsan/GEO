# MongoDB Atlas - New Cluster Setup Guide

Complete step-by-step guide to create a new database user for a fresh MongoDB Atlas cluster and ensure GEO application runs perfectly.

---

## 📋 Prerequisites

- ✅ MongoDB Atlas account created (free)
- ✅ Organization created
- ✅ Project created
- ✅ Cluster provisioned (M0 Free tier recommended)

---

## Step 1: Access MongoDB Atlas Dashboard

### 1.1 Navigate to MongoDB Atlas

1. Go to: https://cloud.mongodb.com
2. Sign in with your account
3. You should see your organization dashboard

### 1.2 Select Your Project

1. Click **Projects** in the sidebar (if not already visible)
2. Select your project: `GEO Development` (or your project name)
3. You should see your cluster listed

### 1.3 Verify Your Cluster Status

1. Click on your cluster name
2. Look for **Status**: Should show something like "Active" ✅ (green)
3. Wait if status shows "Creating..." (takes 10-15 minutes for new cluster)

---

## Step 2: Create Database User

### 2.1 Open Database Access Menu

1. In the left sidebar, navigate to **Security**
2. Click **Database Access**
3. You should see a list of database users (likely empty for new cluster)

### 2.2 Add New Database User

1. Click the button **+ Add New Database User**
   - Location: Top right of the Database Access page
   - Blue button

2. A form will appear: "Add Database User"

### 2.3 Choose Authentication Method

In the form, you'll see:
- **Authentication Method** section
- Select: **Password**
  (This is the default and recommended for applications)

### 2.4 Enter Username

**Username field**:
```
geo_user
```

⚠️ **Important**:
- Only use lowercase letters, numbers, underscores
- No spaces, no special characters
- Maximum 64 characters
- This is what your app will use to connect

### 2.5 Generate Strong Password

**Password field**:

1. Click **Autogenerate Secure Password** button
   - This creates a strong random password
   - Best practice - don't make your own

2. A password will be generated, like:
   ```
   k8@x#mP9!qL2$vR5tW@yZ
   ```

3. **COPY THE PASSWORD IMMEDIATELY** ⚠️
   ```
   You MUST save this password NOW!
   You won't be able to see it again!
   ```

4. Store it somewhere **SAFE**:
   - Password manager (LastPass, 1Password)
   - Secure notes (OneNote with password protection)
   - Document on your computer (encrypted)
   - Screenshots (secure location)

   ❌ **DO NOT**: Leave in chat, email, or unsecured files

### 2.6 Select Built-in Role

**Built-in Role** section:
```
Select: Atlas Admin
```

⚠️ **Important for new cluster**:
- Start with **Atlas Admin** role (full permissions)
- This is safest for initial setup
- After cluster is working, you can restrict later

**Why Atlas Admin?**
- Can create collections
- Can read/write data
- Can create indexes
- Perfect for development

### 2.7 Add User

1. Click button: **Add User**
   - Located at bottom right of form
   - Blue button

2. You should see:
   - Success message (brief notification)
   - Page refreshes
   - Your new user appears in the list: `geo_user`

✅ **Status: Database user created!**

---

## Step 3: Configure Network Access (IP Whitelist)

### 3.1 Open Network Access Menu

1. In the left sidebar under **Security**, click **Network Access**
2. You should see list of IP addresses (likely empty for new cluster)

### 3.2 Add IP Address

1. Click button: **+ Add IP Address**
   - Top right
   - Blue button

2. A modal appears: "Add IP Access List Entry"

### 3.3 Choose Option for Your Situation

#### Option A: Development/Testing (Easiest)

If you're testing locally or on Vercel:

1. Click: **Allow Access from Anywhere**
   - This adds `0.0.0.0/0`
   - Allows connections from ANY IP
   - Safe for development/testing
   - ⚠️ Not recommended for production with real data

2. Description field (optional):
   ```
   Development/Testing Access
   ```

3. Click: **Confirm**

✅ **Status: All IPs whitelisted**

#### Option B: Specific IP (Production)

If deploying to Vercel or specific server:

1. Leave default selected: **Add Current IP Address**
   - OR manually enter IP in the field

2. For Vercel, you would need:
   - Check Vercel documentation for their IP ranges
   - But easier to use Option A for now

### 3.4 Verify Whitelist

In the Network Access page, you should see:
```
IP Address: 0.0.0.0/0 (or your IP)
Status: Active ✅
```

---

## Step 4: Create Database and Collections

### 4.1 Navigate to Collections

1. Click **Collections** in the left sidebar
2. Or click on your cluster name and look for Collections tab

### 4.2 Create Database

1. Look for button: **Create Database** or **Create Collection**
   - If you see **Create Database**, click it
   - If you don't see it, you might need to go to Collections first

2. Modal appears: "Create Database"

Fill in:
- **Database Name**:
  ```
  geo-db
  ```
  ⚠️ Must be exactly this for GEO application

- **Collection Name** (optional):
  ```
  users
  ```
  You can skip this - Mongoose will auto-create collections

3. Click: **Create Database**

✅ **Status: Database created**

### 4.3 Verify Database Created

1. You should see in Collections page:
   ```
   geo-db (database name shown)
   ```

2. Database is now ready for data

---

## Step 5: Get Connection String

### 5.1 Connect to Database

1. Click your **Cluster name** (e.g., "geo-cluster")
2. Click button: **Connect**
   - Large button, center of screen
   - Or look in top toolbar

3. A modal appears: "Connect to Cluster"

### 5.2 Choose Connection Method

You should see options:
- Drivers
- MongoDB Compass
- Mongo Shell

**Select: Drivers** ✅

### 5.3 Select Driver

1. **Driver** dropdown: Select **Node.js**
2. **Version** dropdown: Select **5.8 or later** (or latest)

### 5.4 Copy Connection String

You should see a connection string like:

```
mongodb+srv://geo_user:<password>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
```

**Copy this string** (click copy button or highlight)

### 5.5 Format Connection String for GEO

The string you copied needs to be modified:

**Original**:
```
mongodb+srv://geo_user:<password>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
```

**Replace**:
1. Replace `<password>` with your actual password
   - Example: `k8@x#mP9!qL2$vR5tW@yZ`

2. Add database name before `?`
   - Add `/geo-db` before the `?`

**Final Connection String**:
```
mongodb+srv://geo_user:k8@x#mP9!qL2$vR5tW@yZ@cluster0.abc123.mongodb.net/geo-db?retryWrites=true&w=majority
```

**Format**: `mongodb+srv://USERNAME:PASSWORD@CLUSTER/DATABASE?OPTIONS`

---

## Step 6: Save Connection String

### 6.1 Store Securely

Store your connection string in multiple places:

1. **Password Manager**:
   - Field name: GEO MongoDB Connection String
   - Value: `mongodb+srv://geo_user:PASSWORD@cluster0.xxx/geo-db?...`

2. **Environment File** (.env):
   - Save to: `backend-new/.env`
   - Variable: `MONGODB_URL=mongodb+srv://...`
   - ⚠️ Never commit .env to git

3. **Document**:
   - Create a separate text file
   - Store locally on your computer
   - Keep it encrypted/password protected

### 6.2 Example .env File

Create file: `backend-new/.env`

```env
NODE_ENV=development
PORT=8000
MONGODB_URL=mongodb+srv://geo_user:k8@x#mP9!qL2$vR5tW@yZ@cluster0.abc123.mongodb.net/geo-db?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-key-here-at-least-32-characters
JWT_EXPIRY=24h
GROQ_API_KEY=gsk_your_groq_key_here
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX_your_secret
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Step 7: Test Connection Locally

### 7.1 Test with mongosh CLI

If you have mongosh installed locally:

```bash
# Test the connection string
mongosh "mongodb+srv://geo_user:k8@x#mP9!qL2$vR5tW@yZ@cluster0.abc123.mongodb.net/geo-db"

# Should see:
# Atlas [geo-db]>
# You're now connected!

# Test database
> show databases
# Should list your databases

> db.users.find()
# Should return empty array (no data yet)
```

✅ **If connected successfully**, move to Step 8

### 7.2 Test with Backend Application

```bash
# Navigate to backend
cd backend-new

# Install dependencies
npm install

# Add .env file with MONGODB_URL (see Step 6.2)

# Start the backend
npm run dev

# Should see in console:
# ✅ MongoDB connected successfully
# 🚀 Server running on port 8000
```

✅ **If you see both messages**, connection works!

### 7.3 Troubleshooting Connection Issues

**Issue**: "MongoDB connection refused"
```
Solution:
1. Check IP whitelist includes 0.0.0.0/0
2. Check database user exists (geo_user)
3. Check password is correct (no typos)
4. Check cluster is running (not paused)
5. Wait 5-10 minutes if just created cluster
```

**Issue**: "Authentication failed"
```
Solution:
1. Verify username: geo_user
2. Verify password matches what was generated
3. If password has special chars (@, !, #), they must be non-URL-encoded in Connection String
4. Re-copy connection string from Atlas dashboard
```

**Issue**: "Cannot find database geo-db"
```
Solution:
1. Verify you created database named "geo-db"
2. Check connection string includes "/geo-db"
3. Database auto-creates on first insert if doesn't exist
4. You can skip this for now, it will auto-create
```

---

## Step 8: Create Initial Collections (Optional)

### 8.1 Collections Auto-Create

For GEO application:
- **Best approach**: Let Mongoose auto-create collections
- When you insert first user, `users` collection auto-creates
- When you create first business profile, collections auto-create

✅ **You don't need to manually create collections**

### 8.2 Manual Collection Creation (If Needed)

In MongoDB Atlas Collections page:

1. Click: **Create Collection**
2. Database: `geo-db`
3. Collection name: `users` (for example)
4. Click: **Create Collection**

Common collections for GEO:
```
users
businessprofiles
geoscores
gaps
prompts
```

---

## Step 9: Prepare for Production Deployment

### 9.1 Before Deploying to Vercel

Checklist:
- [x] Database user created: `geo_user`
- [x] Password generated and saved
- [x] Database created: `geo-db`
- [x] IP whitelist configured: `0.0.0.0/0` (for now)
- [x] Connection string copied and formatted
- [x] Connection tested locally
- [x] .env file created with MONGODB_URL
- [x] Backend starts and connects to MongoDB

### 9.2 Prepare for Vercel Environment Variables

When deploying to Vercel:

In Vercel Dashboard → Backend Project → Settings → Environment Variables:

Add:
```
Name: MONGODB_URL
Value: mongodb+srv://geo_user:k8@x#mP9!qL2$vR5tW@yZ@cluster0.abc123.mongodb.net/geo-db?retryWrites=true&w=majority
```

⚠️ **Security Note**:
- Password is embedded in connection string
- This is OK in Vercel environment variables (encrypted)
- Never hardcode in source code
- Never commit .env to git

---

## Step 10: Complete Cluster Setup Checklist

Before moving forward, verify ALL items:

### Database User
- [x] Username: `geo_user`
- [x] Password: Generated and saved securely
- [x] Role: Atlas Admin
- [x] Status: Active ✅

### Network Access
- [x] IP added: `0.0.0.0/0` (or specific IP)
- [x] Status: Active ✅
- [x] Connection allowed from your location

### Database
- [x] Name: `geo-db`
- [x] Status: Active ✅
- [x] In Collections view

### Connection String
- [x] Format: `mongodb+srv://geo_user:PASSWORD@cluster0.xxx/geo-db?...`
- [x] Username: `geo_user`
- [x] Password: Included (non-URL-encoded special chars)
- [x] Database: `geo-db`
- [x] Saved securely

### Testing
- [x] Can connect with mongosh CLI (if installed)
- [x] Backend app connects and shows "✅ MongoDB connected"
- [x] No authentication errors
- [x] No timeout errors

---

## 🎯 Your Setup is Complete When:

✅ You can see the green checkmark next to `geo_user` in Database Access
✅ You can see green checkmark next to `0.0.0.0/0` in Network Access
✅ You can see `geo-db` in Collections
✅ Backend console shows: "✅ MongoDB connected successfully"
✅ Connection string saved securely

---

## 📝 Quick Reference

### Your Credentials (Save These Safely!)

```
Cluster Name: geo-cluster (or your name)
Database Name: geo-db
Database User: geo_user
Database Password: [SAVE YOUR PASSWORD HERE]
Connection String: mongodb+srv://geo_user:PASSWORD@cluster0.xxx/geo-db?retryWrites=true&w=majority
```

### Connection String Template

```
mongodb+srv://geo_user:[YOUR_PASSWORD_HERE]@[YOUR_CLUSTER_NAME].mongodb.net/geo-db?retryWrites=true&w=majority
```

### Environment Variable (.env)

```env
MONGODB_URL=mongodb+srv://geo_user:[YOUR_PASSWORD]@[YOUR_CLUSTER].mongodb.net/geo-db?retryWrites=true&w=majority
```

---

## 🔒 Security Reminders

✅ **DO**:
- Save password in password manager
- Use strong auto-generated passwords
- Store connection string securely
- Keep .env file local (not in git)
- Rotate password periodically

❌ **DON'T**:
- Share connection string in messages
- Commit .env to git
- Use simple passwords
- Hardcode credentials in code
- Leave passwords in chat/email

---

## 📞 Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| "Can't find password" | Use Autogenerate button again IF user not yet created. If created, you must reset. |
| "Connection refused" | Check IP whitelist includes your IP or 0.0.0.0/0 |
| "Authentication failed" | Verify username and password exactly match |
| "Timeout after 10s" | Cluster might still be provisioning. Wait 5 minutes. |
| "Database geo-db doesn't exist" | Mongoose will auto-create on first insert. You can skip creation. |
| "Collection doesn't exist" | Mongoose auto-creates on first insert. You don't need to create. |

---

## ✅ Once Complete

After successfully completing all 10 steps:

1. ✅ Proceed to: **VERCEL_DEPLOYMENT_CHECKLIST.md** Phase 2
2. ✅ You can now: Deploy backend with MONGODB_URL
3. ✅ You can now: Deploy frontend knowing database is ready
4. ✅ Users can: Register, login, create profiles
5. ✅ Data can: Persist to MongoDB Atlas

---

**Status**: ✅ NEW CLUSTER SETUP COMPLETE
**Last Updated**: April 22, 2026
**Version**: 1.0.0

Your fresh MongoDB Atlas cluster is now configured and ready for the GEO application!
