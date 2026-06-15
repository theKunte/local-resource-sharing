/**
 * One-time migration script to copy existing User.fcmToken data to DeviceToken table
 * and create default NotificationPreference records for all users.
 *
 * Run with: npx ts-node src/scripts/migrate-fcm-tokens.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting FCM token migration...\n");

  try {
    // 1. Migrate existing FCM tokens to DeviceToken table
    console.log("Step 1: Migrating existing FCM tokens...");
    const usersWithTokens = await prisma.user.findMany({
      where: {
        fcmToken: {
          not: null,
        },
      },
      select: {
        id: true,
        fcmToken: true,
      },
    });

    console.log(`Found ${usersWithTokens.length} users with FCM tokens`);

    let migratedTokens = 0;
    for (const user of usersWithTokens) {
      if (!user.fcmToken) continue;

      // Check if token already exists in DeviceToken table
      const existingToken = await prisma.deviceToken.findUnique({
        where: { token: user.fcmToken },
      });

      if (!existingToken) {
        await prisma.deviceToken.create({
          data: {
            userId: user.id,
            token: user.fcmToken,
            deviceType: "web", // Legacy tokens are all web
            deviceName: "Legacy Device",
            userAgent: "Migrated from User.fcmToken field",
          },
        });
        migratedTokens++;
      }
    }

    console.log(
      `✅ Migrated ${migratedTokens} FCM tokens to DeviceToken table\n`,
    );

    // 2. Create default NotificationPreference for all users
    console.log("Step 2: Creating default notification preferences...");
    const allUsers = await prisma.user.findMany({
      select: { id: true },
    });

    console.log(`Found ${allUsers.length} total users`);

    let createdPreferences = 0;
    for (const user of allUsers) {
      // Check if preference already exists
      const existingPref = await prisma.notificationPreference.findUnique({
        where: { userId: user.id },
      });

      if (!existingPref) {
        await prisma.notificationPreference.create({
          data: {
            userId: user.id,
            // All defaults are true (enabled) per schema
          },
        });
        createdPreferences++;
      }
    }

    console.log(
      `✅ Created ${createdPreferences} default notification preferences\n`,
    );

    console.log("✅ Migration completed successfully!");
    console.log("\nSummary:");
    console.log(`  - ${migratedTokens} FCM tokens migrated`);
    console.log(`  - ${createdPreferences} notification preferences created`);
    console.log(
      `\nNote: User.fcmToken field is now deprecated but kept for backward compatibility.`,
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
