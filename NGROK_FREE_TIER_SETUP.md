# 🎯 ngrok Setup - FREE TIER VERSION

## Reality Check

**ngrok free tier = 1 tunnel only**

So we'll use a hybrid approach:

- **Frontend** → Deploy to Vercel (free, static hosting)
- **Backend** → Tunnel with ngrok (needs local database)

**Total time:** 20-25 minutes

---

## 📋 Step-by-Step Setup

### Step 1: Start Backend Locally (5 min)

```powershell
# Start PostgreSQL with Docker
docker-compose up postgres -d

# Wait for it to be ready
Start-Sleep -Seconds 10

# Start backend locally (not in Docker, for easier config)
cd backend
npm install
npm run dev
```

Your backend should now be running on `http://localhost:3001`

---

### Step 2: Create ngrok Tunnel for Backend (2 min)

```powershell
# In a new terminal
ngrok http 3001
```

You'll see:

```
Forwarding    https://abc123.ngrok.io -> http://localhost:3001
```

**Copy this URL!** This is your public backend API URL.
Example: `https://abc123.ngrok.io`

⚠️ **Keep this terminal open during the event!**

---

### Step 3: Deploy Frontend to Vercel (10-15 min)

#### A. Install Vercel CLI

```powershell
npm install -g vercel
```

#### B. Update Frontend Environment Config

Edit `frontend/.env` (or create it):

```bash
# Your ngrok backend URL from Step 2
VITE_API_URL=https://abc123.ngrok.io

# Your existing Firebase config
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

#### C. Deploy to Vercel

```powershell
cd frontend
vercel --prod
```

Follow the prompts:

- "Set up and deploy?" → **Y**
- "Which scope?" → Select your account
- "Link to existing project?" → **N**
- "What's your project's name?" → **gearshare** (or whatever you want)
- "In which directory is your code located?" → **.**
- "Want to override the settings?" → **N**

Vercel will:

1. Build your app
2. Deploy it
3. Give you a public URL like: `https://gearshare-xyz.vercel.app`

**Copy this URL!** This is your live app.

---

### Step 4: Update Backend CORS (2 min)

Your backend needs to allow requests from the Vercel URL.

Edit `backend/.env`:

```bash
ALLOWED_ORIGINS=http://localhost:5173,https://gearshare-xyz.vercel.app
```

Restart your backend:

```powershell
# Stop with Ctrl+C in the backend terminal
# Then restart
cd backend
npm run dev
```

---

### Step 5: Update Your QR Code (1 min)

1. Open [qr-codes.html](qr-codes.html)
2. Click "✏️ Update Links"
3. Enter your **Vercel URL** in "Live Demo URL": `https://gearshare-xyz.vercel.app`
4. Save!

---

## ✅ Testing

1. Open your Vercel URL in a browser (incognito is good for testing)
2. Try to sign up/login
3. Try creating a group or listing an item
4. Check browser console for errors

If everything works → **You're ready!** 🎉

---

## 📱 At the Event

**Keep running on your laptop:**

- ✅ PostgreSQL container: `docker-compose up postgres -d`
- ✅ Backend dev server: `npm run dev` (in backend folder)
- ✅ ngrok tunnel: `ngrok http 3001` (separate terminal)
- ✅ Good WiFi connection

**Your frontend is already live on Vercel** - no need to keep anything running for that!

**Show people:**

- Your QR code with the Vercel URL
- They can use the app from their phones
- Everything works through your tunneled backend

---

## 🔄 If You Need to Restart

If ngrok disconnects or you restart:

1. Start ngrok again: `ngrok http 3001`
2. **NEW URL!** Copy the new ngrok URL
3. Update Vercel environment variable:
   ```powershell
   cd frontend
   vercel env add VITE_API_URL
   # Enter the new ngrok URL
   vercel --prod
   ```

Or faster - just update frontend/.env locally and redeploy:

```powershell
# Edit frontend/.env with new ngrok URL
cd frontend
vercel --prod
```

---

## ⚡ Alternative: Skip Deployment

If you're really tight on time:

**Just use the QR codes without deployment:**

1. Keep [qr-codes.html](qr-codes.html) open with GitHub and LinkedIn
2. Don't add a live demo URL
3. Show your code and architecture instead
4. Still impressive for networking!

---

## 🆘 Troubleshooting

### Frontend can't reach backend

- Check ngrok tunnel is still running
- Verify `VITE_API_URL` in Vercel matches ngrok URL
- Check backend CORS allows Vercel URL
- Look at browser console for errors

### Vercel build fails

- Make sure all environment variables are set
- Check `frontend/.env` has all Firebase configs
- Try building locally first: `npm run build`

### ngrok session expires (2 hours on free tier)

Just restart ngrok and update Vercel with the new URL:

```powershell
# Restart ngrok
ngrok http 3001

# Update and redeploy
cd frontend
# Update .env with new URL
vercel --prod
```

---

## 💡 Pro Tips

1. **Test before the event** - Don't wait until you arrive!
2. **Screenshot your ngrok URL** - easy to reference
3. **Keep terminals visible** - know if something disconnects
4. **Bring laptop charger** - running backend locally drains battery
5. **Venue WiFi is critical** - ngrok needs internet

---

## 📊 What's Running Where

```
┌─────────────────────────────────────────┐
│  User's Phone/Browser                   │
│  → https://gearshare-xyz.vercel.app     │
│     (Frontend on Vercel)                │
└─────────────────┬───────────────────────┘
                  │
                  │ API Requests
                  ▼
┌─────────────────────────────────────────┐
│  ngrok Tunnel                           │
│  → https://abc123.ngrok.io              │
└─────────────────┬───────────────────────┘
                  │
                  │ Forwards to
                  ▼
┌─────────────────────────────────────────┐
│  Your Laptop                            │
│  ├─ Backend: localhost:3001             │
│  └─ PostgreSQL: localhost:5432          │
└─────────────────────────────────────────┘
```

---

## 🎯 Quick Command Reference

```powershell
# Start PostgreSQL
docker-compose up postgres -d

# Start backend
cd backend
npm run dev

# Create tunnel (separate terminal)
ngrok http 3001

# Deploy frontend (after updating .env)
cd frontend
vercel --prod

# Check PostgreSQL
docker-compose ps

# View backend logs
# (just look at the terminal where npm run dev is running)

# Stop everything after event
docker-compose down
# Close ngrok terminal (Ctrl+C)
# Stop backend (Ctrl+C)
```

---

## 🎉 You're Ready!

**What you have:**

- ✅ Live frontend on Vercel (always accessible)
- ✅ Backend tunneled through ngrok (when laptop is on)
- ✅ Full working app with database
- ✅ Only using free tiers!

**Setup time:** 20-25 minutes  
**Cost:** $0  
**Coolness factor:** 💯

Good luck at your event! 🚀
