-- SQL Script to Check for Duplicates
-- Run this to see if you have duplicates before running the cleanup script

-- Check for duplicate GroupMembers (same user in same group multiple times)
SELECT 
    groupId, 
    userId, 
    COUNT(*) as count
FROM GroupMember
GROUP BY groupId, userId
HAVING COUNT(*) > 1;

-- Check for duplicate ResourceSharing (same resource shared to same group multiple times)
SELECT 
    resourceId, 
    groupId, 
    COUNT(*) as count
FROM ResourceSharing
GROUP BY resourceId, groupId
HAVING COUNT(*) > 1;

-- Count total duplicates
SELECT 
    'GroupMember' as table_name,
    SUM(count - 1) as duplicate_count
FROM (
    SELECT COUNT(*) as count
    FROM GroupMember
    GROUP BY groupId, userId
    HAVING COUNT(*) > 1
)
UNION ALL
SELECT 
    'ResourceSharing' as table_name,
    SUM(count - 1) as duplicate_count
FROM (
    SELECT COUNT(*) as count
    FROM ResourceSharing
    GROUP BY resourceId, groupId
    HAVING COUNT(*) > 1
);
