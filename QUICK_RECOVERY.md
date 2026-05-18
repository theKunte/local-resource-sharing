# Quick Reference: Data Protection Commands

## 🚀 Quick Recovery (You're Here Now)

Your data was lost, but I've already seeded 8 demo resources for you!

```powershell
# Verify your resources are back
cd backend
npm run db:check
```

## 📦 Daily Commands

### Create Backup

```powershell
cd backend
npm run db:backup
```

### Restore Latest Backup

```powershell
cd backend
npm run db:restore
```

### Check Database Status

```powershell
cd backend
npm run db:check
```

## 🛡️ One-Time Setup

### Enable Automatic Daily Backups (Recommended!)

```powershell
cd backend
.\scripts\auto-backup-cron.ps1
```

This runs daily at 2 AM and keeps your last 10 backups automatically.

## ⚠️ Critical Rules

### ✅ SAFE Commands (Won't Lose Data)

```powershell
docker compose down          # Safe - stops containers, keeps data
docker compose restart       # Safe - just restarts
docker compose up -d         # Safe - starts containers
```

### ❌ DANGEROUS Commands (WILL Lose Data)

```powershell
docker compose down -v       # DELETES VOLUMES - Backup first!
docker volume rm ...         # DELETES DATA - Backup first!
docker system prune --volumes # DELETES EVERYTHING - Backup first!
```

### 🔐 Golden Rule

**Always run `npm run db:backup` before:**

- Running database migrations
- Removing Docker volumes
- Testing cleanup scripts
- Trying experimental features

## 📚 Full Documentation

See [DATA_PROTECTION.md](./DATA_PROTECTION.md) for complete guide including:

- Automated backup setup
- Recovery procedures
- Best practices
- Troubleshooting

---

**Your gear is now restored! 🎉**  
Log in to see your 8 demo resources, then add your real gear through the app.
