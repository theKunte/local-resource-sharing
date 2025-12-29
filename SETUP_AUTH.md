# Backend Authentication Setup Instructions

## Step 1: Install Required Packages

```powershell
cd backend
npm install firebase-admin express-rate-limit
```

## Step 2: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon → Project Settings
4. Go to "Service Accounts" tab
5. Click "Generate new private key"
6. Download the JSON file

## Step 3: Configure Environment Variables

Create `backend/.env` file (or update existing):

```env
# Database
DATABASE_URL="file:./prisma/dev.db"

# Server
PORT=3001
NODE_ENV=development

# Firebase Admin SDK (from downloaded JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Private_Key_Here\n-----END PRIVATE KEY-----\n"

# CORS Settings
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

**IMPORTANT**: Copy the values from your downloaded JSON:

- `project_id` → `FIREBASE_PROJECT_ID`
- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `private_key` → `FIREBASE_PRIVATE_KEY` (keep the quotes and \n characters)

## Step 4: Update Frontend Environment

Add to `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
```

## Step 5: Restart Backend

```powershell
cd backend
npm run dev
```

You should see:

```
✅ Firebase Admin initialized
Server listening on port 3001
```

## Step 6: Test Authentication

The frontend is already updated to send tokens automatically!

Try:

1. Sign in with Google
2. Create/view resources
3. Check backend logs - you should see token verification happening

## What Changed?

### Backend:

- ✅ Firebase Admin SDK initialized
- ✅ CORS restricted to specific origins
- ✅ Rate limiting (100 req/15min per IP)
- ✅ `authenticateToken` middleware added
- ✅ All write endpoints protected
- ✅ User ownership validation

### Frontend:

- ✅ `apiClient` utility auto-adds auth tokens
- ✅ `useFirebaseAuth` uses apiClient
- ✅ Environment-aware API URL

## Security Features Now Active:

1. **Token Verification**: Every API request validates Firebase token
2. **User Authorization**: Users can only modify their own resources
3. **CORS Protection**: Only allowed origins can call API
4. **Rate Limiting**: Prevents API abuse
5. **Automatic Token Refresh**: Frontend handles token expiration

## Troubleshooting:

**Error: "Firebase Admin initialization error"**

- Check your FIREBASE_PRIVATE_KEY format
- Make sure it has `\n` characters, not actual newlines
- Keep the quotes around the private key

**Error: "Not allowed by CORS"**

- Add your frontend URL to ALLOWED_ORIGINS in backend/.env

**401 Unauthorized errors**

- Make sure you're signed in
- Check browser console for token errors
- Verify Firebase config is correct

## Next Steps:

Run the backend and test! Everything should work seamlessly with authentication now.
