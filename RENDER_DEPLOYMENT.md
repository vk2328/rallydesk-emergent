# RallyDesk - Production Deployment Guide for Render

## Production Readiness Assessment

### ✅ Ready
- Full-stack application (React + FastAPI + MongoDB)
- User authentication (JWT + Google OAuth)
- Core tournament management features
- Division & player management with CSV import
- Draw generation with seeding options
- Live match scoring and bracket progression
- Public live match center (no auth required)
- Dark/light theme support
- Responsive UI with Shadcn components

### ⚠️ Recommendations Before Production
1. **Database**: Use MongoDB Atlas (free tier available) instead of local MongoDB
2. **Environment Variables**: Secure all secrets
3. **CORS**: Restrict to your domain only
4. **Rate Limiting**: Consider adding for API protection
5. **Error Logging**: Add production error tracking (e.g., Sentry)

---

## Quick Reference - Final URLs

| Service | URL |
|---------|-----|
| Frontend | `https://rallydesk.app` |
| Frontend (www) | `https://www.rallydesk.app` |
| Backend API | `https://api.rallydesk.app` |

---

## Render Deployment Instructions

### Step 1: Prepare Your Repository

1. Push your code to GitHub/GitLab
2. Ensure these files exist in your repo root:
   - `/backend/requirements.txt`
   - `/frontend/package.json`

### Step 2: Set Up MongoDB Atlas (Free)

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create free cluster (M0 Sandbox - FREE)
3. **Create database user:**
   - Go to **Database Access** → **Add New Database User**
   - Choose **Password** authentication
   - Create username and strong password (avoid special characters like `@`, `%`, `/` in password)
   - Set privileges to **Read and write to any database**

4. **Configure Network Access (IMPORTANT!):**
   - Go to **Network Access** → **Add IP Address**
   - Click **Allow Access from Anywhere** (adds `0.0.0.0/0`)
   - Click **Confirm**
   - ⚠️ **This step is critical** - without it, Render cannot connect to your database

5. **Get connection string:**
   - Go to **Database** → **Connect** → **Drivers**
   - Copy the connection string
   - Replace `<password>` with your actual password
   - Add database name before the `?`:
   ```
   mongodb+srv://username:password@cluster.xxxxx.mongodb.net/rallydesk?retryWrites=true&w=majority
   ```

### Step 3: Deploy Backend on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   ```
   Name: rallydesk-api
   Region: Oregon (or closest)
   Branch: main
   Root Directory: backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn server:app --host 0.0.0.0 --port $PORT
   Instance Type: Free (or Starter $7/mo for better performance)
   ```

5. Add Environment Variables:
   ```
   MONGO_URL=mongodb+srv://<user>:<password>@cluster.xxxxx.mongodb.net/rallydesk
   DB_NAME=rallydesk
   JWT_SECRET=<generate-a-secure-random-string-64-chars>
   CORS_ORIGINS=https://your-frontend-url.onrender.com
   GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-oauth-secret>
   GOOGLE_REDIRECT_URI=https://rallydesk-api.onrender.com/api/auth/google/callback
   ```

6. Click "Create Web Service"

### Step 4: Deploy Frontend on Render

1. Click "New" → "Static Site"
2. Connect same GitHub repo
3. Configure:
   ```
   Name: rallydesk
   Branch: main
   Root Directory: frontend
   Build Command: yarn install && yarn build
   Publish Directory: build
   ```

4. Add Environment Variables:
   ```
   REACT_APP_BACKEND_URL=https://rallydesk-api.onrender.com
   ```

5. Click "Create Static Site"

### Step 5: Configure Routing (Important!)

For React Router to work, add a `_redirects` file:

Create `/frontend/public/_redirects`:
```
/*    /index.html   200
```

Or in Render dashboard, go to your static site → "Redirects/Rewrites" and add:
```
Source: /*
Destination: /index.html
Action: Rewrite
```

### Step 6: Update Google OAuth (If Using)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client
4. Add Authorized redirect URIs:
   - `https://rallydesk-api.onrender.com/api/auth/google/callback`
5. Add Authorized JavaScript origins:
   - `https://rallydesk.onrender.com`

---

## Environment Variables Summary

### Backend (.env)
```env
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/rallydesk
DB_NAME=rallydesk
JWT_SECRET=your-64-character-secret-key-here
CORS_ORIGINS=https://rallydesk.onrender.com
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://rallydesk-api.onrender.com/api/auth/google/callback
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=https://rallydesk-api.onrender.com
```

---

## Post-Deployment Checklist

- [ ] Backend health check: `https://rallydesk-api.onrender.com/api/health`
- [ ] Frontend loads correctly
- [ ] User registration works
- [ ] User login works
- [ ] Google OAuth works (if configured)
- [ ] Tournament creation works
- [ ] Player CSV import works
- [ ] Draw generation works
- [ ] Live match center accessible without login

---

## Cost Estimate (Render)

| Service | Plan | Cost |
|---------|------|------|
| Backend API | Free | $0/mo |
| Frontend Static | Free | $0/mo |
| MongoDB Atlas | M0 Free | $0/mo |
| **Total** | | **$0/mo** |

For better performance:
- Starter Backend: $7/mo (no cold starts)
- MongoDB Atlas M2: $9/mo (better performance)

---

## Troubleshooting

### Backend won't start
- Check Render logs for errors
- Verify MONGO_URL is correct
- Ensure all env variables are set

### Frontend API calls fail
- Check CORS_ORIGINS includes your frontend URL
- Verify REACT_APP_BACKEND_URL is correct
- Check browser console for errors

### Google OAuth fails
- Verify redirect URI matches exactly
- Check GOOGLE_CLIENT_ID and SECRET are correct
- Ensure OAuth consent screen is configured

---

## Alternative: One-Click Deploy with render.yaml

Create `render.yaml` in your repo root for blueprint deployment:

```yaml
services:
  - type: web
    name: rallydesk-api
    env: python
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn server:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: MONGO_URL
        sync: false
      - key: DB_NAME
        value: rallydesk
      - key: JWT_SECRET
        generateValue: true
      - key: CORS_ORIGINS
        sync: false

  - type: web
    name: rallydesk
    env: static
    rootDir: frontend
    buildCommand: yarn install && yarn build
    staticPublishPath: build
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    envVars:
      - key: REACT_APP_BACKEND_URL
        sync: false
```

Then in Render: New → Blueprint → Connect repo → Deploy

---

## Custom Domain Setup (rallydesk.app)

### Step 1: Add Custom Domains in Render

#### For Frontend (Static Site):
1. Go to **Render Dashboard** → Select your **frontend static site**
2. Click **Settings** → Scroll to **Custom Domains**
3. Click **Add Custom Domain**
4. Add these domains:
   - `rallydesk.app` (root domain)
   - `www.rallydesk.app`
5. Note the DNS targets Render provides (e.g., `rallydesk.onrender.com`)

#### For Backend (Web Service):
1. Select your **backend web service**
2. **Settings** → **Custom Domains**
3. Add: `api.rallydesk.app`
4. Note the DNS target provided

### Step 2: Configure DNS in GoDaddy

1. Log in to **GoDaddy.com**
2. Go to **My Products** → Find `rallydesk.app` → Click **DNS**
3. Delete any existing A records for `@` (root)
4. Add/Edit the following DNS records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| **A** | `@` | `216.24.57.1` | 600 |
| **CNAME** | `www` | `rallydesk.onrender.com` | 600 |
| **CNAME** | `api` | `rallydesk-api.onrender.com` | 600 |

> **Note:** The IP `216.24.57.1` is Render's load balancer IP for root domains. Replace the CNAME values with the actual DNS targets Render provides.

### Step 3: Verify & Enable SSL

1. Back in **Render Dashboard**, wait for DNS propagation (5-30 minutes)
2. Render will automatically issue an **SSL certificate**
3. Status will change from "Pending" to **"Verified"** ✅

### Step 4: Update Environment Variables for Custom Domain

#### Backend Environment Variables (Render Dashboard):
```
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/rallydesk
DB_NAME=rallydesk
JWT_SECRET=your-64-character-secret-key-here
CORS_ORIGINS=https://rallydesk.app,https://www.rallydesk.app
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### Frontend Environment Variables (Render Dashboard):
```
REACT_APP_BACKEND_URL=https://api.rallydesk.app
```

### Step 5: Update Google OAuth for Custom Domain

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client
4. Update **Authorized JavaScript origins**:
   - `https://rallydesk.app`
   - `https://www.rallydesk.app`
5. Update **Authorized redirect URIs**:
   - `https://api.rallydesk.app/api/auth/google/callback`

### DNS Propagation Timeline
- **Typical:** 5-30 minutes
- **Maximum:** Up to 48 hours
- **SSL Certificate:** Automatic after DNS verification

---

## Troubleshooting Custom Domain

### Domain shows "Pending" in Render
- DNS hasn't propagated yet - wait up to 30 minutes
- Verify DNS records are correct in GoDaddy
- Use [DNS Checker](https://dnschecker.org) to verify propagation

### SSL Certificate not issued
- Ensure domain is verified first
- Check that no conflicting DNS records exist
- Wait for DNS propagation to complete

### API calls fail after domain change
- Verify `REACT_APP_BACKEND_URL` is set to `https://api.rallydesk.app`
- Check `CORS_ORIGINS` includes both `https://rallydesk.app` and `https://www.rallydesk.app`
- Clear browser cache and try again

### Google OAuth fails
- Update redirect URIs in Google Cloud Console
- Ensure the callback URL matches exactly: `https://api.rallydesk.app/api/auth/google/callback`
