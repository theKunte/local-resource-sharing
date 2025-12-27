const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkData() {
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
      resources.forEach((r, i) => {
        console.log(
          `  ${i + 1}. ${r.title} - ${r.description.substring(0, 50)}...`
        );
      });
    } else {
      console.log("\n⚠️  No resources found in database");
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
