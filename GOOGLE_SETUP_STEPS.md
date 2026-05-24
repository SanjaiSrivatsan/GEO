# 🔑 Step-by-Step: Getting Google Cloud Credentials

## Step 1: Create Google Cloud Project

1. Go to: https://console.cloud.google.com/
2. Click "Select a Project" → "NEW PROJECT"
3. Enter project name: `GEO-Engine` (or your name)
4. Click "CREATE"
5. Wait for project to be created
6. Select the project from the dropdown

---

## Step 2: Enable Required APIs

### Enable Google+ API
1. In Google Cloud Console, go to **APIs & Services → Library**
2. Search for: `Google+ API`
3. Click on it
4. Click **ENABLE**

### Enable Custom Search API
1. Go to **APIs & Services → Library**
2. Search for: `Custom Search API`
3. Click on it
4. Click **ENABLE**

### Enable Google Business Profile API
1. Go to **APIs & Services → Library**
2. Search for: `Google Business Profile API`
3. Click on it
4. Click **ENABLE**

---

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **+ CREATE CREDENTIALS** (top button)
3. Select **OAuth client ID**
4. If prompted, click **Configure OAuth consent screen first**

### Configure OAuth Consent Screen:
1. Choose **External** user type
2. Click **CREATE**
3. Fill in:
   - **App name**: GEO Engine
   - **User support email**: your-email@gmail.com
   - **Developer contact**: your-email@gmail.com
4. Click **SAVE AND CONTINUE**
5. Click through scopes (add if needed):
   - `userinfo.email`
   - `userinfo.profile`
6. Add test users (add your email)
7. Click **SAVE AND CONTINUE** → **BACK TO DASHBOARD**

### Create OAuth Client ID:
1. Go back to **Credentials**
2. Click **+ CREATE CREDENTIALS → OAuth client ID**
3. Select: **Web application**
4. Under "Authorized redirect URIs" add:
   - `http://localhost:8000/api/google/oauth/callback` (for development)
   - `https://yourdomain.com/api/google/oauth/callback` (for production)
5. Click **CREATE**

**You will get:**
- `CLIENT_ID`
- `CLIENT_SECRET`

---

## Step 4: Create API Keys

1. Go to **API & Services → Credentials**
2. Click **+ CREATE CREDENTIALS → API Key**
3. **Copy the API Key** (use for `GOOGLE_API_KEY`)

---

## Step 5: Create Custom Search Engine

1. Go to: https://cse.google.com/cse/
2. Click **Create** (or **New search engine**)
3. Under "Sites to search", enter: `www.google.com`
4. Click **CREATE**
5. Go to your search engine settings
6. **Copy the Search Engine ID** (looks like: `1234567890:abcdefg`)

---

## Summary: What You'll Get

```
GOOGLE_CLIENT_ID = xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET = xxxxx_xxxxx_xxxxx
GOOGLE_API_KEY = AIzaSy...
GOOGLE_CSE_ID = 1234567890:abcdefg
GOOGLE_REDIRECT_URI = http://localhost:8000/api/google/oauth/callback
```

---

## What To Do Now

1. ✅ Follow these steps above
2. ✅ Collect all the values
3. ✅ Come back and provide them to me
4. ✅ I'll wire everything up and test it

---

**Once you have all values, provide them in this format:**

```
GOOGLE_CLIENT_ID: [your value]
GOOGLE_CLIENT_SECRET: [your value]
GOOGLE_API_KEY: [your value]
GOOGLE_CSE_ID: [your value]
MONGODB_URI: [your value]
OPENAI_API_KEY: [your value]
```

**Then I'll:**
- ✅ Update all environment files
- ✅ Wire up all services with real APIs
- ✅ Test each endpoint
- ✅ Get everything production-ready
