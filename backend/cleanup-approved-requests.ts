import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupStaleApprovedRequests() {
  try {
    console.log("🔍 Finding stale APPROVED borrow requests...");

    const approvedRequests = await prisma.borrowRequest.findMany({
      where: {
        status: "APPROVED",
      },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        resource: {
          select: {
            title: true,
          },
        },
      },
    });

    console.log(`\nFound ${approvedRequests.length} APPROVED requests:\n`);
    approvedRequests.forEach((req, i) => {
      console.log(`${i + 1}. ${req.resource.title}`);
      console.log(`   ID: ${req.id}`);
      console.log(
        `   Period: ${req.startDate.toISOString().split("T")[0]} to ${
          req.endDate.toISOString().split("T")[0]
        }`
      );
      console.log(`   Created: ${req.createdAt.toISOString().split("T")[0]}`);
      console.log("");
    });

    if (approvedRequests.length === 0) {
      console.log("✅ No stale APPROVED requests found!");
      return;
    }

    console.log("🧹 Changing all APPROVED requests to REJECTED...\n");

    const result = await prisma.borrowRequest.updateMany({
      where: {
        status: "APPROVED",
      },
      data: {
        status: "REJECTED",
      },
    });

    console.log(
      `✅ Successfully updated ${result.count} requests to REJECTED status`
    );
    console.log("\nYou can now make new borrow requests without conflicts!");
  } catch (error) {
    console.error("❌ Error cleaning up requests:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupStaleApprovedRequests();
