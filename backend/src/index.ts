import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: "5mb" })); // Allow large payloads for images

// Root route for API info or friendly message
app.get("/", (req, res) => {
  res.send(
    "<h2>Local Resource Sharing API is running.<br>Use <code>/api/resources</code> to access resources.</h2>"
  );
});

// --- RESOURCES API --- //

// Get all resources visible to a user: their own, or shared with a group they belong to
app.get("/api/resources", async (req, res) => {
  try {
    const userId = req.query.ownerId as string | undefined;
    if (!userId) return res.status(400).json({ error: "ownerId (userId) required" });

    // Get group IDs the user is a member of
    const groupMemberships = await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });
    const groupIds = groupMemberships.map((g) => g.groupId);

    // Get resources owned by the user
    const ownResources = await prisma.resource.findMany({ where: { ownerId: userId } });

    // Get resources shared with any group the user is a member of
    const sharedResources = await prisma.resourceSharing.findMany({
      where: { groupId: { in: groupIds } },
      include: { resource: true },
    });
    const sharedResourceList = sharedResources.map((s) => s.resource);

    // Merge and deduplicate by resource id
    const allResources = [...ownResources, ...sharedResourceList].filter(
      (res, idx, arr) => arr.findIndex(r => r.id === res.id) === idx
    );
    res.json(allResources);
  } catch (error) {
    console.error("Error fetching resources:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Post a new resource to the database
app.post("/api/resources", async (req, res) => {
  const { title, description, ownerId, image } = req.body;
  if (!title || !ownerId) {
    return res.status(400).json({ error: "Title and ownerId are required." });
  }

  try {
    // Ensure user exists
    await prisma.user.upsert({
      where: { id: ownerId },
      update: {},
      create: {
        id: ownerId,
        email: req.body.email || ownerId + "@local.firebase", // fallback if no email
        name: req.body.name || null,
      },
    });
    // Create resource
    const resource = await prisma.resource.create({
      data: { title, description, ownerId, image },
    });
    res.status(201).json(resource);
  } catch (error) {
    console.error("Error creating resource:", error);
    res.status(500).json({ error: "Failed to create resource" });
  }
});

// Update a resource by id
app.put("/api/resources/:id", async (req, res) => {
  const id = req.params.id;
  const { title, description } = req.body;
  if (!title || !description) {
    return res
      .status(400)
      .json({ error: "Title and description are required." });
  }
  try {
    const updated = await prisma.resource.update({
      where: { id },
      data: { title, description },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error updating resource:", error);
    res.status(404).json({ error: "Resource not found" });
  }
});

// Delete a resource by id
app.delete("/api/resources/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await prisma.resource.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting resource:", error);
    res.status(404).json({ error: "Resource not found" });
  }
});

// --- GROUPS API ---
// Create a group
app.post("/api/groups", async (req, res) => {
  const { name, createdById } = req.body;
  if (!name || !createdById) {
    return res
      .status(400)
      .json({ error: "Group name and creator are required." });
  }
  try {
    const group = await prisma.group.create({
      data: {
        name,
        createdById,
        members: {
          create: { userId: createdById }, // Add creator as first member
        },
      },
    });
    res.status(201).json(group);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Failed to create group" });
  }
});

// Add a user to a group
app.post("/api/groups/:groupId/add-member", async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "User ID required" });
  try {
    const member = await prisma.groupMember.create({
      data: { groupId, userId },
    });
    res.status(201).json(member);
  } catch (error) {
    console.error("Error adding member:", error);
    res.status(500).json({ error: "Failed to add member" });
  }
});

// List groups for a user
app.get("/api/groups", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });
  try {
    const groups = await prisma.groupMember.findMany({
      where: { userId },
      include: { group: true },
    });
    res.json(groups.map((g) => g.group));
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

// List resources for a group
app.get("/api/groups/:groupId/resources", async (req, res) => {
  const { groupId } = req.params;
  try {
    const shared = await prisma.resourceSharing.findMany({
      where: { groupId },
      include: { resource: true },
    });
    res.json(shared.map((s) => s.resource));
  } catch (error) {
    console.error("Error fetching group resources:", error);
    res.status(500).json({ error: "Failed to fetch group resources" });
  }
});

// Share a resource with a group
app.post("/api/resources/:resourceId/share", async (req, res) => {
  const { resourceId } = req.params;
  const { groupId } = req.body;
  if (!groupId) return res.status(400).json({ error: "groupId required" });
  try {
    const sharing = await prisma.resourceSharing.create({
      data: { resourceId, groupId },
    });
    res.status(201).json(sharing);
  } catch (error) {
    console.error("Error sharing resource:", error);
    res.status(500).json({ error: "Failed to share resource" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
