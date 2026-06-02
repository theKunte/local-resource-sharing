# 🚀 Simple ngrok Setup - NO VERCEL NEEDED!

## The Solution: Reverse Proxy

Instead of deploying frontend to Vercel, we use **nginx as a reverse proxy** to combine both frontend and backend into **one tunnel**.

**Time:** 10-15 minutes

---

## 📋 How It Works

```
Your Phone
    ↓
ngrok tunnel (https://abc123.ngrok.io)
    ↓
nginx Reverse Proxy (port 8080)
    ├─ "/" → Frontend (port 80)
    └─ "/api" → Backend (port 3001)

All on your laptop ✅
Only 1 ngrok tunnel ✅
No external hosting needed ✅
```

---

## 🚀 Quick Start

### Step 1: Configure ngrok (one-time setup, 2 min)

If you haven't already:

```powershell
# Sign up at https://ngrok.com
# Get your authtoken from dashboard

ngrok config add-authtoken YOUR_TOKEN_HERE
```

### Step 2: Start Everything with Docker (5 min)

```powershell
# Start all services (database, backend, frontend, nginx proxy)
docker-compose up -d

# Wait for services to be ready
Start-Sleep -Seconds 15

# Check everything is running
docker-compose ps
```

You should see 4 services running:

- ✅ postgres
- ✅ backend
- ✅ frontend
- ✅ nginx-proxy

### Step 3: Create ngrok Tunnel (1 min)

```powershell
# Tunnel the nginx proxy (combines both frontend & backend)
ngrok http 8080
```

You'll see output like:

```
Forwarding    https://abc123.ngrok.io -> http://localhost:8080
```

**Copy this URL!** Example: `https://abc123.ngrok.io`

⚠️ **Keep this terminal open!**

### Step 4: Update Frontend Config (3 min)

The frontend needs to know the backend API URL.

**Option A: Update .env and rebuild (recommended)**

Edit your root `.env` file:

```bash
VITE_API_URL=https://abc123.ngrok.io/api
```

Rebuild frontend:

```powershell
docker-compose up -d --build frontend
```

**Option B: Quick test without rebuild**

Just use the relative path (frontend will call `/api` which nginx routes to backend):

- Frontend will automatically use the same domain for API calls
- No rebuild needed!

### Step 5: Update Backend CORS (2 min)

Edit `backend/.env`:

```bash
ALLOWED_ORIGINS=http://localhost:5173,https://abc123.ngrok.io
```

Restart backend:

```powershell
docker-compose restart backend
```

### Step 6: Update QR Code (1 min)

1. Open [qr-codes.html](qr-codes.html)
2. Click "✏️ Update Links"
3. Enter your ngrok URL: `https://abc123.ngrok.io`
4. Add your LinkedIn URL
5. Click "💾 Save & Update QR Codes"

### Step 7: Test! 🎉

Open the ngrok URL on your phone:

- Frontend should load
- Try signing up/logging in
- Create a group
- List an item

**If everything works → You're ready for the event!** 🚀

---

## 📱 At the Event

### Keep Running:

- ✅ Docker containers: `docker-compose ps` (should show all running)
- ✅ ngrok tunnel: Terminal with `ngrok http 8080`
- ✅ Laptop on WiFi and plugged in

### Show People:

- Your QR code (they scan it)
- Opens your ngrok URL
- They can use the full app!

---

## 🔄 If ngrok Disconnects

ngrok free tier expires after 2 hours. To restart:

```powershell
# 1. Close old ngrok (Ctrl+C)

# 2. Start new tunnel
ngrok http 8080

# 3. Copy NEW URL (it will change!)

# 4. Update backend/.env with new ALLOWED_ORIGINS

# 5. Update qr-codes.html with new URL

# 6. Restart backend
docker-compose restart backend
```

**Optional:** If you updated VITE_API_URL:

```powershell
# Update root .env with new ngrok URL
docker-compose up -d --build frontend
```

---

## 🆘 Troubleshooting

### "Cannot connect to backend"

```powershell
# Check all services are running
docker-compose ps

# Check nginx logs
docker-compose logs nginx-proxy

# Check backend logs
docker-compose logs backend
```

### "CORS error in browser console"

```powershell
# Make sure backend/.env has your ngrok URL
ALLOWED_ORIGINS=http://localhost:5173,https://YOUR-NGROK-URL.ngrok.io

# Restart backend
docker-compose restart backend
```

### "Frontend shows but can't login"

```powershell
# Check if Firebase env vars are set in root .env
# Verify backend is accessible: https://your-ngrok-url.ngrok.io/api/health
```

### Port 8080 already in use

```powershell
# Find and kill the process using port 8080
Get-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess | Stop-Process

# Or change the port in docker-compose.yml:
# nginx-proxy:
#   ports:
#     - "8081:8080"  # Use 8081 instead
# Then: ngrok http 8081
```

---

## 🎯 Architecture Details

### How nginx Routes Requests:

```
User requests: https://abc123.ngrok.io/
    → nginx sees path "/"
    → Proxies to frontend:80
    → Frontend served

User requests: https://abc123.ngrok.io/api/resources
    → nginx sees path "/api"
    → Proxies to backend:3001/api/resources
    → API response returned
```

### Why This Works with 1 Tunnel:

- ngrok tunnels **port 8080** (the nginx proxy)
- nginx **routes traffic** based on URL path:
  - `/` → Frontend
  - `/api` → Backend
- Both services accessible through **one public URL**
- No need for Vercel or any external hosting!

---

## ⚡ Quick Commands Reference

```powershell
# Start everything
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart backend

# Stop everything
docker-compose down

# Start ngrok tunnel
ngrok http 8080

# Rebuild after config change
docker-compose up -d --build frontend
```

---

## 💡 Pro Tips

1. **Test before the event** - Make sure everything works at home
2. **Screenshot your ngrok URL** - Easy reference
3. **Keep terminals visible** - Know if something disconnects
4. **Disable laptop sleep** - Power settings before event
5. **Bring charger** - Running Docker + ngrok drains battery
6. **Venue WiFi critical** - Test as soon as you arrive

---

## 🎉 You're Ready!

**What you have:**

- ✅ Full-stack app running locally
- ✅ One ngrok tunnel exposing everything
- ✅ People can access from their phones
- ✅ No external hosting needed
- ✅ Free tier usage only!

**Setup time:** 10-15 minutes  
**Cost:** $0  
**Coolness factor:** 💯

Good luck at your event! 🚀
