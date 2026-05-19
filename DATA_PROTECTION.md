# Data Protection & Backup Guide

This guide explains how to protect your data from accidental loss and recover from backups.

## ⚠️ What Happened to Your Data?

If you recently lost resources/groups during development, the most common causes are:

- Running `docker compose down -v` (the `-v` flag **deletes all data**)
- Database migrations that reset data
- Data cleanup scripts that deleted too much
- Branch switching with conflicting database states

**Your situation:** Without pre-existing backups, your original data cannot be recovered. The automated backup system is **now active** to prevent this from happening again.

**Next steps:**

1. ✅ Automated daily backups are installed (runs at 2 AM daily)
2. ✅ Use `npm run db:backup` before risky operations
3. ℹ️ Re-add your gear through the app UI (original data is permanently lost)

---

## 🔒 Prevention Strategies

### 1. Docker Volume Persistence

Your data is stored in a Docker volume `local-resource-sharing_db_data` which persists even if containers are stopped or removed.

**⚠️ Data is ONLY lost if:**

- You run `docker compose down -v` (the `-v` flag removes volumes)
- You manually delete the volume with `docker volume rm`
- You run `docker system prune -a --volumes` without being careful

**Safe operations that WON'T lose data:**

- `docker compose down` (without `-v`)
- `docker compose restart`
- `docker compose up -d` (restart containers)

### 2. Automated Backups

#### Setup Automated Daily Backups

Run this **once** to schedule automatic backups:

```powershell
cd backend
.\scripts\auto-backup-cron.ps1
```

This creates a Windows Task Scheduler job that:

- Runs daily at 2:00 AM
- Creates timestamped backup files
- Automatically keeps only the last 10 backups
- Stores backups in `backend/backups/`

#### Manual Backup

Create a backup anytime:

```powershell
cd backend
npm run db:backup
```

Or directly:

```powershell
cd backend
.\scripts\backup-db.ps1
```

Backups are saved as: `backups/backup_YYYYMMDD_HHMMSS.sql`

### 3. Separate Development and Production

**Best Practice**: Use different databases for:

- **Development**: Your local Docker setup (can be reset/seeded with demo data)
- **Production**: A separate hosted database (with backups)

## 🔄 Recovery Procedures

### Restore from Latest Backup

```powershell
cd backend
npm run db:restore
```

This restores from the most recent backup automatically.

### Restore from Specific Backup

```powershell
cd backend
.\scripts\restore-db.ps1 -BackupFile ".\backups\backup_20260518_140000.sql"
```

Or run without parameters to see a list of available backups:

```powershell
cd backend
.\scripts\restore-db.ps1
```

## 📊 Check Database Status

View current database contents:

```powershell
cd backend
npm run db:check
# or
node check-data.js
```

This shows:

- Number of resources, users, groups
- Sample resource titles

## 🛡️ Best Practices

### 1. **Before Major Changes**

Always create a backup before:

- Running database migrations
- Testing new features that modify data
- Upgrading Docker containers
- Experimenting with cleanup scripts

```powershell
npm run db:backup  # Quick backup before changes
```

### 2. **Regular Backup Verification**

Periodically verify your backups work:

```powershell
# Create test backup
npm run db:backup

# Verify backup size and content
ls .\backups\backup_*.sql | Select-Object Name, Length, LastWriteTime
```

### 3. **Backup Before Volume Operations**

**ALWAYS backup before** running commands with `-v`:

```powershell
# ✅ CORRECT - Backup first
npm run db:backup
docker compose down -v  # Now safe to remove volumes

# ❌ DANGEROUS - Don't do this without backup!
docker compose down -v  # Data lost forever!
```

### 4. **Export Important Data**

For critical data, consider exporting to JSON:

```javascript
// Export your resources
const resources = await prisma.resource.findMany({
  where: { ownerId: "your-user-id" },
  include: { sharedWith: true },
});
fs.writeFileSync("my-resources.json", JSON.stringify(resources, null, 2));
```

### 5. **Use Git for Configuration**

While data shouldn't be in Git, configuration files should be:

- ✅ Prisma schema (`schema.prisma`)
- ✅ Migrations (`prisma/migrations/`)
- ❌ Backup files (`.sql` files - too large)
- ❌ Database itself

## 🚨 Emergency Recovery

### If Data is Lost and No Backup Exists

1. **Check if Docker volume still exists:**

   ```powershell
   docker volume ls | Select-String "local-resource-sharing"
   ```

2. **If volume exists, data might be recoverable:**

   ```powershell
   docker compose down
   docker compose up -d
   npm run db:check
   ```

3. **If volume is gone:**
   - Data is unrecoverable
   - Re-add your resources through the app

### If Containers Won't Start

```powershell
# Check logs
docker compose logs backend
docker compose logs postgres

# Try rebuilding
docker compose down
docker compose build --no-cache
docker compose up -d
```

## 📅 Backup Schedule Recommendations

- **Development**: Weekly manual backups
- **Production**: Daily automated backups (keep 30+ days)
- **Before migrations**: Always backup first
- **Before experiments**: Always backup first

## 🔍 Monitoring

Check your automatic backup status:

```powershell
# View scheduled task
Get-ScheduledTask -TaskName "LocalResourceSharing-DailyBackup"

# View recent backups
ls .\backend\backups\backup_*.sql | Select-Object Name, Length, LastWriteTime | Sort-Object LastWriteTime -Descending

# Test backup now
Start-ScheduledTask -TaskName "LocalResourceSharing-DailyBackup"
```

## 💾 Storage Considerations

- Each backup is typically 5-50 KB (text SQL file)
- Keeping 10 backups = ~500 KB storage
- Compressed backups can save 80% space:
  ```powershell
  Compress-Archive -Path .\backups\backup_*.sql -DestinationPath .\backups\archive.zip
  ```

## ❓ FAQ

**Q: Will backups slow down my app?**  
A: No, backups are created outside the app. Scheduled backups run at 2 AM when the app is idle.

**Q: Can I backup to cloud storage?**  
A: Yes! After creating a backup, copy to OneDrive, Dropbox, or cloud storage:

```powershell
Copy-Item .\backups\backup_*.sql -Destination "C:\Users\$env:USERNAME\OneDrive\Backups\"
```

**Q: How do I backup Firebase data?**  
A: Firebase data (images, user accounts) is managed separately. Use Firebase Console for exports.

**Q: Can I automate cloud backups?**  
A: Yes! Modify `backup-db.ps1` to include cloud upload commands at the end.

---

**Remember**: The best backup is the one you have before you need it! 🎯
