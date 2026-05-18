/**
 * Database Status Check Utility
 * Displays current database statistics and sample resources
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SampleResource {
  title: string;
  description: string;
  ownerId: string;
}

async function checkData(): Promise<void> {
  try {
    const resourceCount = await prisma.resource.count();
    const userCount = await prisma.user.count();
    const groupCount = await prisma.group.count();

    console.log("\n📊 Database Status:");
    console.log("==================");
    console.log(`Resources: ${resourceCount}`);
    console.log(`Users: ${userCount}`);
    console.log(`Groups: ${groupCount}`);

    if (resourceCount > 0) {
      console.log("\n✅ Your gear is still in the database!");
      const resources = await prisma.resource.findMany({
        take: 5,
        select: { title: true, description: true, ownerId: true },
      });
      console.log("\nSample resources:");
      resources.forEach((resource: SampleResource, index: number) => {
        console.log(
          `  ${index + 1}. ${resource.title} - ${resource.description.substring(0, 50)}...`,
        );
      });
    } else {
      console.log("\n⚠️  No resources found in database");
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", errorMessage);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void checkData();
