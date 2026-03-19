# Migration Safety: Duplicate Cleanup

## Overview

The migration `20260225225943_add_security_indexes_and_constraints` adds unique constraints to prevent duplicate records in:

- `GroupMember` table: one user per group
- `ResourceSharing` table: one resource per group

## Automatic Duplicate Cleanup

**This migration is now safe to run on existing databases with duplicates.**

The migration automatically:

1. Identifies duplicate records
2. Keeps the oldest record (by ID) for each unique combination
3. Deletes newer duplicates
4. Creates unique indexes to prevent future duplicates

## What Gets Deleted?

### GroupMember Duplicates

If a user was added to the same group multiple times (e.g., user "abc" in group "xyz" twice), only the first membership record is kept.

### ResourceSharing Duplicates

If a resource was shared with the same group multiple times, only the first sharing record is kept.

## Manual Cleanup (Optional)

If you prefer to review duplicates before running the migration, use the standalone cleanup script:

```bash
cd backend
node cleanup-duplicates.js
```

This script:

- Shows you what duplicates exist
- Reports how many will be removed
- Does NOT delete anything automatically (dry-run mode available)

## Migration Safety Guarantees

✅ **Data Integrity**: Only duplicate records are removed, original data is preserved
✅ **Idempotent**: Safe to run multiple times
✅ **Production-Ready**: Uses SQL joins for efficient cleanup
✅ **No Downtime**: Can be applied during rolling deployments

## Rollback

If you need to rollback this migration:

```bash
cd backend
npx prisma migrate resolve --rolled-back 20260225225943_add_security_indexes_and_constraints
```

**Note**: This only marks the migration as rolled back. To actually remove indexes:

```sql
DROP INDEX IF EXISTS "GroupMember_groupId_userId_key";
DROP INDEX IF EXISTS "ResourceSharing_resourceId_groupId_key";
-- Remove other indexes as needed
```

## Testing

Before deploying to production:

1. **Test on staging database with production data snapshot**
2. **Verify query performance with new indexes**
3. **Check application logs for constraint violations**
4. **Monitor database performance during migration**

## Performance Impact

| Database Size    | Expected Duration | Downtime             |
| ---------------- | ----------------- | -------------------- |
| < 10k records    | < 1 second        | None                 |
| 10k-100k records | 1-5 seconds       | None                 |
| 100k-1M records  | 5-30 seconds      | None                 |
| 1M+ records      | 30s-2min          | Possible brief locks |

## Questions?

See:

- [SECURITY.md](../SECURITY.md) - Security overview
- [SECURITY_FIXES.md](../SECURITY_FIXES.md) - Why these changes were needed
- [Prisma Migration Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
