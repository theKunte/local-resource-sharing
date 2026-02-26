/**
 * Cleanup Script: Remove Duplicate Records Before Migration
 *
 * This script removes duplicate GroupMember and ResourceSharing records
 * that would violate the new unique constraints.
 *
 * Run this before applying the migration:
 * node cleanup-duplicates.js
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function cleanupDuplicateGroupMembers() {
  console.log("\n🔍 Checking for duplicate GroupMembers...");

  // Find all group members
  const allMembers = await prisma.groupMember.findMany({
    orderBy: [{ groupId: "asc" }, { userId: "asc" }, { id: "asc" }],
  });

  const seen = new Set();
  const duplicates = [];

  for (const member of allMembers) {
    const key = `${member.groupId}-${member.userId}`;
    if (seen.has(key)) {
      duplicates.push(member.id);
    } else {
      seen.add(key);
    }
  }

  if (duplicates.length > 0) {
    console.log(`⚠️  Found ${duplicates.length} duplicate GroupMember records`);
    console.log(
      "🗑️  Removing duplicates (keeping oldest record for each group-user pair)...",
    );

    const deleted = await prisma.groupMember.deleteMany({
      where: {
        id: { in: duplicates },
      },
    });

    console.log(`✅ Removed ${deleted.count} duplicate GroupMember records`);
  } else {
    console.log("✅ No duplicate GroupMembers found");
  }

  return duplicates.length;
}

async function cleanupDuplicateResourceSharing() {
  console.log("\n🔍 Checking for duplicate ResourceSharing...");

  // Find all resource sharing records
  const allSharing = await prisma.resourceSharing.findMany({
    orderBy: [{ resourceId: "asc" }, { groupId: "asc" }, { id: "asc" }],
  });

  const seen = new Set();
  const duplicates = [];

  for (const sharing of allSharing) {
    const key = `${sharing.resourceId}-${sharing.groupId}`;
    if (seen.has(key)) {
      duplicates.push(sharing.id);
    } else {
      seen.add(key);
    }
  }

  if (duplicates.length > 0) {
    console.log(
      `⚠️  Found ${duplicates.length} duplicate ResourceSharing records`,
    );
    console.log(
      "🗑️  Removing duplicates (keeping oldest record for each resource-group pair)...",
    );

    const deleted = await prisma.resourceSharing.deleteMany({
      where: {
        id: { in: duplicates },
      },
    });

    console.log(
      `✅ Removed ${deleted.count} duplicate ResourceSharing records`,
    );
  } else {
    console.log("✅ No duplicate ResourceSharing found");
  }

  return duplicates.length;
}

async function main() {
  console.log("🚀 Starting duplicate cleanup...");
  console.log(
    "📊 This will check and remove duplicate records that would violate unique constraints",
  );

  try {
    const groupMemberDupes = await cleanupDuplicateGroupMembers();
    const resourceSharingDupes = await cleanupDuplicateResourceSharing();

    const totalDupes = groupMemberDupes + resourceSharingDupes;

    console.log("\n" + "=".repeat(60));
    console.log("📋 CLEANUP SUMMARY");
    console.log("=".repeat(60));
    console.log(`GroupMember duplicates removed: ${groupMemberDupes}`);
    console.log(`ResourceSharing duplicates removed: ${resourceSharingDupes}`);
    console.log(`Total duplicates removed: ${totalDupes}`);
    console.log("=".repeat(60));

    if (totalDupes === 0) {
      console.log(
        "\n✅ Your database is clean! You can now run the migration:",
      );
      console.log(
        "   npx prisma migrate dev --name add_security_indexes_and_constraints",
      );
    } else {
      console.log("\n✅ Cleanup complete! You can now run the migration:");
      console.log(
        "   npx prisma migrate dev --name add_security_indexes_and_constraints",
      );
    }
  } catch (error) {
    console.error("\n❌ Error during cleanup:", error);
    console.error("\nPlease fix the error and try again.");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
