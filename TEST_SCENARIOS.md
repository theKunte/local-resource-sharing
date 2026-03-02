# Testing Guide for Logger & Error Handling Improvements

## 🎯 What We Changed

1. ✅ Fixed logger singleton in backend
2. ✅ Replaced 34 console.* calls with structured logging
3. ✅ Replaced alert() with professional error UI

---

## 🧪 Test Scenarios

### Scenario 1: Backend Structured Logging

**Goal:** Verify all errors are logged with context

**Steps:**
1. Start backend: `cd backend && npm run dev`
2. Make unauthorized API call:
   ```bash
   curl http://localhost:3001/api/resources
   ```
3. **Expected Output:**
   ```
   [2026-02-27T...] [SECURITY] Authentication failed - no token | {"path":"/api/resources","method":"GET"}
   ```

**✅ Pass Criteria:**
- Timestamp present `[2026-02-27T...]`
- Log level present `[SECURITY]`, `[ERROR]`, `[INFO]`
- Context JSON included `{"path":...}`
- No raw `console.error()` messages

---

### Scenario 2: Firebase Persistence Error UI

**Goal:** Test graceful error handling without alert()

**Steps:**
1. Edit `frontend/src/firebase.ts` - add before `setPersistence`:
   ```typescript
   throw new Error("Test error");
   ```
2. Start frontend: `cd frontend && npm run dev`
3. Open browser to `http://localhost:5173`

**✅ Pass Criteria:**
- Professional error screen appears (not alert)
- Shows warning icon
- Has "Authentication Error" heading
- Has "Refresh Page" button
- No browser alert() popup

**To Reset:** Remove the `throw new Error()` line

---

### Scenario 3: Missing Firebase Config

**Goal:** Test config validation

**Steps:**
1. Backup `frontend/.env`
2. Comment out: `VITE_FIREBASE_API_KEY=...`
3. Start frontend: `npm run dev`
4. Check browser console

**✅ Pass Criteria:**
- Error is logged (dev mode)
- App doesn't crash
- User sees appropriate error message

**To Reset:** Restore `frontend/.env`

---

### Scenario 4: Normal Operation

**Goal:** Verify everything works normally

**Steps:**
1. Ensure all test changes are removed
2. Start backend: `cd backend && npm run dev`
3. Start frontend: `cd frontend && npm run dev`
4. Login and use the application normally
5. Check browser DevTools console

**✅ Pass Criteria:**
- `✅ Firebase auth persistence set to session-only`
- No alert() popups
- No console.error() messages
- All features work normally

---

### Scenario 5: Production Logging

**Goal:** Verify sensitive data is filtered

**Steps:**
1. Set `NODE_ENV=production` in backend
2. Trigger an error with sensitive data
3. Check logs

**✅ Pass Criteria:**
- Sensitive fields (password, token, secret) are removed
- Error messages still present
- Stack traces simplified

---

## 📊 Quick Verification Checklist

Before committing:

- [ ] Backend compiles: `cd backend && npm run build`
- [ ] Frontend compiles: `cd frontend && npm run build`
- [ ] No `console.error()` in backend/src/index.ts
- [ ] No `console.log()` for production code
- [ ] No `alert()` in firebase.ts
- [ ] Logger imported as singleton: `import { logger } from ...`
- [ ] Error UI has proper styling
- [ ] All tests pass

---

## 🐛 Troubleshooting

### Issue: "Logger is not defined"
**Fix:** Check import is `import { logger }` not `import { Logger }`

### Issue: Alert still appears
**Fix:** Clear browser cache and hard refresh (Ctrl+Shift+R)

### Issue: Logs not showing context
**Fix:** Verify logger.error() has 3rd parameter: `logger.error(msg, error, { context })`

---

## 📝 Example Log Outputs

### Good (Structured):
```
[2026-02-27T10:15:32.123Z] [ERROR] Error fetching groups | {"userId":"abc123","groupId":"xyz789","path":"/api/groups","error":"Database connection failed"}
```

### Bad (Old Style):
```
Error fetching groups: Error: Database connection failed
```

---

## 🎉 Success Indicators

You'll know everything works when:

1. ✅ Terminal logs are structured with timestamps
2. ✅ No alert() popups appear
3. ✅ Professional error screens work
4. ✅ Context is included in all error logs
5. ✅ Dev and production logs behave differently
6. ✅ Both servers compile without errors
