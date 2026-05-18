require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, createdAt: true },
    });
    console.log("\n👥 Users in database:");
    console.log(JSON.stringify(users, null, 2));

    const groups = await prisma.group.findMany({
      select: { id: true, name: true, createdAt: true, createdById: true },
    });
    console.log("\n👥 Groups in database:");
    console.log(JSON.stringify(groups, null, 2));

    // Check for any orphaned resource sharing records
    const resourceSharings = await prisma.resourceSharing.count();
    const borrowRequests = await prisma.borrowRequest.count();
    const loans = await prisma.loan.count();

    console.log("\n📊 Related records:");
    console.log(`Resource Sharings: ${resourceSharings}`);
    console.log(`Borrow Requests: ${borrowRequests}`);
    console.log(`Loans: ${loans}`);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
