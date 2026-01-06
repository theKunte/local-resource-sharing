import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import rateLimit from "express-rate-limit";
import admin from "firebase-admin";
import helmet from "helmet";
import {
  validateResourceInput,
  validateGroupInput,
  sanitizeString,
} from "./utils/validation";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

// Initialize Firebase Admin SDK for token verification
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
    console.log("✅ Firebase Admin initialized");
  } catch (error) {
    console.error("❌ Firebase Admin initialization error:", error);
  }
}

// Security headers - protect against common vulnerabilities
app.use(helmet());

// Restricted CORS - only allow specific origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:5173",
  "http://localhost:5174",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Rate limiting - prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per window (increased for testing)
  message: "Too many requests from this IP, please try again later.",
});

app.use("/api/", limiter);
app.use(express.json({ limit: "5mb" })); // Allow large payloads for images

// Authentication Middleware
async function authenticateToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No authorization token provided" });
    }

    const token = authHeader.split("Bearer ")[1];

    // Verify the token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Attach user info to request
    (req as any).user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };

    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

// Root route for API info or friendly message
app.get("/", (req, res) => {
  res.send(
    "<h2>Local Resource Sharing API is running.<br>Use <code>/api/resources</code> to access resources.</h2>"
  );
});

// --- RESOURCES API --- //

// Get all resources from the database, with group-based visibility
app.get("/api/resources", authenticateToken, async (req, res) => {
  try {
    const userId = req.query.user as string | undefined;
    const ownerId = req.query.ownerId as string | undefined;
    const authenticatedUserId = (req as any).user.uid;

    // If ownerId is provided, return only that user's resources (for their profile)
    if (ownerId) {
      // Only allow users to view their own resources or resources they have access to
      const resources = await prisma.resource.findMany({
        where: { ownerId },
        include: {
          owner: {
            select: { id: true, email: true, name: true },
          },
          currentLoan: {
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              returnedDate: true,
              borrower: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });
      return res.json(resources);
    }

    // If no user is specified, return empty array (no public resources)
    if (!userId) {
      return res.json([]);
    }

    // Find all groups the user belongs to
    const userGroups = await prisma.groupMember.findMany({
      where: { userId: userId },
      select: { groupId: true },
    });

    const groupIds = userGroups.map((ug) => ug.groupId);

    // Find all resources shared with these groups (including borrowed ones to show status)
    const resourceSharings = await prisma.resourceSharing.findMany({
      where: {
        groupId: { in: groupIds },
      },
      include: {
        resource: {
          include: {
            owner: {
              select: { id: true, email: true, name: true },
            },
            currentLoan: {
              select: {
                id: true,
                status: true,
                startDate: true,
                endDate: true,
                returnedDate: true,
                borrower: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
      },
    });

    // Extract unique resources and exclude the user's own resources
    const uniqueResources = new Map();
    resourceSharings.forEach((sharing) => {
      const resource = sharing.resource;
      if (resource.ownerId !== userId && !uniqueResources.has(resource.id)) {
        uniqueResources.set(resource.id, resource);
      }
    });

    const resources = Array.from(uniqueResources.values());
    res.json(resources);
  } catch (error) {
    console.error("Error fetching resources:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get pending request count for a resource
app.get(
  "/api/resources/:id/pending-requests-count",
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;

    try {
      const count = await prisma.borrowRequest.count({
        where: {
          resourceId: id,
          status: "PENDING",
        },
      });

      res.json({ resourceId: id, pendingRequestsCount: count });
    } catch (error) {
      console.error("Error fetching pending requests count:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Post a new resource to the database
app.post("/api/resources", authenticateToken, async (req, res) => {
  const { title, description, ownerId, image } = req.body;
  const authenticatedUserId = (req as any).user.uid;

  // Validate input
  const validation = validateResourceInput({ title, description, ownerId });
  if (!validation.valid) {
    return res.status(400).json({ error: validation.errors.join(", ") });
  }

  // Ensure user can only create resources for themselves
  if (ownerId !== authenticatedUserId) {
    return res
      .status(403)
      .json({ error: "You can only create resources for yourself" });
  }

  try {
    // Ensure user exists
    const user = await prisma.user.upsert({
      where: { id: ownerId },
      update: {
        // Update email and name if they've changed
        email: req.body.email ? req.body.email.toLowerCase() : undefined,
        name: req.body.name || undefined,
      },
      create: {
        id: ownerId,
        email: req.body.email
          ? req.body.email.toLowerCase()
          : ownerId + "@local.firebase", // fallback if no email
        name: req.body.name || null,
      },
    });

    // Check if user is in any groups, if not create a default group
    const userGroups = await prisma.groupMember.findMany({
      where: { userId: ownerId },
    });

    if (userGroups.length === 0) {
      // Create a default "Friends" group for the user
      const defaultGroup = await prisma.group.create({
        data: {
          name: "My Friends",
          createdById: ownerId,
          members: {
            create: { userId: ownerId },
          },
        },
      });

      // Update the creator's role to "owner"
      await prisma.groupMember.updateMany({
        where: {
          groupId: defaultGroup.id,
          userId: ownerId,
        },
        data: {},
      });
    }

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
app.put("/api/resources/:id", authenticateToken, async (req, res) => {
  const id = req.params.id;
  const { title, description } = req.body;
  const authenticatedUserId = (req as any).user.uid;

  // Validate input
  const validation = validateResourceInput({
    title,
    description,
    ownerId: authenticatedUserId,
  });
  if (!validation.valid) {
    return res.status(400).json({ error: validation.errors.join(", ") });
  }

  try {
    // Verify user owns this resource
    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }
    if (resource.ownerId !== authenticatedUserId) {
      return res
        .status(403)
        .json({ error: "You can only update your own resources" });
    }

    const updated = await prisma.resource.update({
      where: { id },
      data: { title, description },
      select: {
        id: true,
        title: true,
        description: true,
        image: true,
        ownerId: true,
        status: true,
        currentLoanId: true,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error updating resource:", error);
    res.status(404).json({ error: "Resource not found" });
  }
});

// Delete a resource by id
app.delete("/api/resources/:id", authenticateToken, async (req, res) => {
  const id = req.params.id;
  const authenticatedUserId = (req as any).user.uid;

  try {
    // Verify resource exists
    const resource = await prisma.resource.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Enforce ownership check
    if (resource.ownerId !== authenticatedUserId) {
      return res
        .status(403)
        .json({ error: "You don't have permission to delete this resource" });
    }

    // Remove any sharing records first to avoid foreign key constraint errors
    await prisma.resourceSharing.deleteMany({ where: { resourceId: id } });

    await prisma.resource.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting resource:", error);
    res.status(500).json({ error: "Failed to delete resource" });
  }
});

// --- GROUPS API ---
// Create a group
app.post("/api/groups", authenticateToken, async (req, res) => {
  const { name, createdById } = req.body;

  // Validate input
  const validation = validateGroupInput({ name, createdById });
  if (!validation.valid) {
    return res.status(400).json({ error: validation.errors.join(", ") });
  }

  try {
    const group = await prisma.group.create({
      data: {
        name,
        createdById,
        members: {
          create: { userId: createdById }, // Add creator as first member, we'll update role later
        },
      },
    });

    // Update the creator's role to "owner"
    await prisma.groupMember.updateMany({
      where: {
        groupId: group.id,
        userId: createdById,
      },
      data: {
        role: "owner",
      },
    });

    res.status(201).json(group);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Failed to create group" });
  }
});

// Add a user to a group
app.post(
  "/api/groups/:groupId/add-member",
  authenticateToken,
  async (req, res) => {
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
  }
);

// List groups for a user
app.get("/api/groups", authenticateToken, async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });
  try {
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      select: {
        role: true,
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, email: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    // Add user's role to each group and format the response
    const groupsWithRole = memberships.map((membership) => {
      return {
        ...membership.group,
        userRole: membership.role,
        memberCount: membership.group.members.length,
      };
    });

    res.json(groupsWithRole);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

// List resources for a group
app.get(
  "/api/groups/:groupId/resources",
  authenticateToken,
  async (req, res) => {
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
  }
);

// Share a resource with a group
app.post(
  "/api/resources/:resourceId/share",
  authenticateToken,
  async (req, res) => {
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
  }
);

// Get group members
app.get("/api/groups/:groupId/members", authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  try {
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });
    res.json(members);
  } catch (error) {
    console.error("Error fetching group members:", error);
    res.status(500).json({ error: "Failed to fetch group members" });
  }
});

// Invite user to group (by email)
app.post("/api/groups/:groupId/invite", authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  const { email, invitedBy } = req.body;

  if (!email || !invitedBy) {
    return res.status(400).json({ error: "Email and invitedBy are required" });
  }

  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Verify the inviter is a member of the group
    const inviterMembership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: invitedBy,
      },
    });

    if (!inviterMembership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group" });
    }

    // Check if user exists with this email (case insensitive)
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        error: "User not found",
        message: `No user found with email ${email}. They need to sign up first using Google authentication.`,
      });
    }

    // Check if user is already in the group
    const existingMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: existingUser.id,
      },
    });

    if (existingMember) {
      return res.status(400).json({
        error: "Already a member",
        message: `${email} is already a member of this group`,
      });
    }

    // Add user to group
    const member = await prisma.groupMember.create({
      data: {
        groupId,
        userId: existingUser.id,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      member,
      message: `Successfully added ${existingUser.email} to the group`,
    });
  } catch (error) {
    console.error("Error inviting user to group:", error);
    res.status(500).json({ error: "Failed to invite user to group" });
  }
});

// Remove user from group
app.delete(
  "/api/groups/:groupId/members/:userId",
  authenticateToken,
  async (req, res) => {
    const { groupId, userId } = req.params;

    try {
      await prisma.groupMember.deleteMany({
        where: {
          groupId,
          userId,
        },
      });
      res.status(204).end();
    } catch (error) {
      console.error("Error removing user from group:", error);
      res.status(500).json({ error: "Failed to remove user from group" });
    }
  }
);

// Update group (for avatar, name, etc.)
app.put("/api/groups/:groupId", authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  const { name, avatar, description, userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    // Verify user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
      },
      select: {
        role: true,
        group: {
          select: {
            id: true,
            name: true,
            avatar: true,
            createdById: true,
          },
        },
      },
    });

    if (!membership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group" });
    }

    // Check if user has edit permissions (owner or admin)
    const canEdit = membership.role === "owner" || membership.role === "admin";
    if (!canEdit) {
      return res
        .status(403)
        .json({ error: "You don't have permission to edit this group" });
    }

    const updateData: any = {};
    if (name !== undefined && name.trim()) updateData.name = name.trim();
    if (avatar !== undefined) updateData.avatar = avatar; // Allow setting to null/empty
    if (description !== undefined) updateData.description = description;

    // Ensure at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: updateData,
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      group: updatedGroup,
      message: "Group updated successfully",
    });
  } catch (error) {
    console.error("Error updating group:", error);
    res.status(500).json({ error: "Failed to update group" });
  }
});

// Delete a group (only group creator can delete)
app.delete("/api/groups/:groupId", authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    // Verify user is the group owner
    const userMembership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!userMembership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group" });
    }

    if (userMembership.role !== "owner") {
      return res
        .status(403)
        .json({ error: "Only the group owner can delete this group" });
    }

    // Get group info for response message
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Delete all related data first (due to foreign key constraints)
    await prisma.resourceSharing.deleteMany({
      where: { groupId },
    });

    await prisma.groupMember.deleteMany({
      where: { groupId },
    });

    // Finally delete the group
    await prisma.group.delete({
      where: { id: groupId },
    });

    res.json({
      success: true,
      message: `Group "${group.name}" has been deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ error: "Failed to delete group" });
  }
});

// Transfer group ownership
app.put(
  "/api/groups/:groupId/transfer-ownership",
  authenticateToken,
  async (req, res) => {
    const { groupId } = req.params;
    const { currentOwnerId, newOwnerId } = req.body;

    if (!currentOwnerId || !newOwnerId) {
      return res
        .status(400)
        .json({ error: "Current owner ID and new owner ID are required" });
    }

    try {
      // Verify current user is the group owner
      const currentOwnerMembership = await prisma.groupMember.findFirst({
        where: {
          groupId,
          userId: currentOwnerId,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!currentOwnerMembership) {
        return res
          .status(403)
          .json({ error: "You are not a member of this group" });
      }

      if (currentOwnerMembership.role !== "owner") {
        return res
          .status(403)
          .json({ error: "Only the group owner can transfer ownership" });
      }

      // Verify new owner is a member of the group
      const newOwnerMembership = await prisma.groupMember.findFirst({
        where: {
          groupId,
          userId: newOwnerId,
        },
        include: {
          user: {
            select: { email: true, name: true },
          },
        },
      });

      if (!newOwnerMembership) {
        return res
          .status(400)
          .json({ error: "New owner must be a member of the group" });
      }

      // Update roles: current owner becomes admin, new owner becomes owner
      await prisma.groupMember.updateMany({
        where: {
          groupId,
          userId: currentOwnerId,
        },
        data: {
          role: "admin",
        } as any,
      });

      await prisma.groupMember.updateMany({
        where: {
          groupId,
          userId: newOwnerId,
        },
        data: {
          role: "owner",
        } as any,
      });

      // Also update the group's createdById field
      const updatedGroup = await prisma.group.update({
        where: { id: groupId },
        data: { createdById: newOwnerId },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, email: true, name: true },
              },
            },
          },
        },
      });

      res.json({
        success: true,
        group: updatedGroup,
        message: `Group ownership transferred to ${
          newOwnerMembership.user.name || newOwnerMembership.user.email
        }`,
      });
    } catch (error) {
      console.error("Error transferring group ownership:", error);
      res.status(500).json({ error: "Failed to transfer group ownership" });
    }
  }
);

// Get group details with permissions
app.get("/api/groups/:groupId/details", authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.query.userId as string;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
        resources: {
          include: {
            resource: {
              include: {
                owner: {
                  select: { id: true, email: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is a member
    const userMembership = group.members.find((m) => m.userId === userId);
    if (!userMembership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group" });
    }

    // Calculate permissions
    const isCreator = group.createdById === userId;
    const permissions = {
      canEdit: isCreator,
      canDelete: isCreator,
      canInvite: true, // All members can invite
      canRemoveMembers: isCreator,
      canTransferOwnership: isCreator,
    };

    res.json({
      ...group,
      memberCount: group.members.length,
      sharedResourcesCount: group.resources.length,
      userPermissions: permissions,
    });
  } catch (error) {
    console.error("Error fetching group details:", error);
    res.status(500).json({ error: "Failed to fetch group details" });
  }
});

// Remove member from group (group creator only, except for self-removal)
app.delete(
  "/api/groups/:groupId/remove-member",
  authenticateToken,
  async (req, res) => {
    const { groupId } = req.params;
    const { userId, targetUserId } = req.body;

    if (!userId || !targetUserId) {
      return res
        .status(400)
        .json({ error: "User ID and target user ID are required" });
    }

    try {
      // Get group info
      const group = await prisma.group.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      // Check permissions: user can remove themselves, or group creator can remove others
      const canRemove = userId === targetUserId || group.createdById === userId;

      if (!canRemove) {
        return res
          .status(403)
          .json({ error: "You don't have permission to remove this member" });
      }

      // Prevent group creator from being removed by others
      if (targetUserId === group.createdById && userId !== targetUserId) {
        return res
          .status(403)
          .json({ error: "Group creator cannot be removed by others" });
      }

      // Get target user info before removal
      const targetMember = await prisma.groupMember.findFirst({
        where: {
          groupId,
          userId: targetUserId,
        },
        include: {
          user: {
            select: { email: true, name: true },
          },
        },
      });

      if (!targetMember) {
        return res
          .status(404)
          .json({ error: "User is not a member of this group" });
      }

      // Remove member
      await prisma.groupMember.deleteMany({
        where: {
          groupId,
          userId: targetUserId,
        },
      });

      const action = userId === targetUserId ? "left" : "removed from";
      const userName = targetMember.user.name || targetMember.user.email;

      res.json({
        success: true,
        message: `${userName} has been ${action} the group`,
      });
    } catch (error) {
      console.error("Error removing group member:", error);
      res.status(500).json({ error: "Failed to remove group member" });
    }
  }
);

// Update member role (assign/remove admin rights)
app.put(
  "/api/groups/:groupId/members/:userId/role",
  authenticateToken,
  async (req, res) => {
    const { groupId, userId: targetUserId } = req.params;
    const { requesterId, role } = req.body;

    if (!requesterId || !role) {
      return res
        .status(400)
        .json({ error: "Requester ID and role are required" });
    }

    if (!["member", "admin"].includes(role)) {
      return res
        .status(400)
        .json({ error: "Role must be 'member' or 'admin'" });
    }

    try {
      // Verify requester is a member of the group
      const requesterMembership = await prisma.groupMember.findFirst({
        where: {
          groupId,
          userId: requesterId,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!requesterMembership) {
        return res
          .status(403)
          .json({ error: "You are not a member of this group" });
      }

      // Only owners can assign/remove admin roles
      if (requesterMembership.role !== "owner") {
        return res
          .status(403)
          .json({ error: "Only group owners can assign admin rights" });
      }

      // Verify target user is a member of the group
      const targetMembership = await prisma.groupMember.findFirst({
        where: {
          groupId,
          userId: targetUserId,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!targetMembership) {
        return res
          .status(404)
          .json({ error: "User is not a member of this group" });
      }

      // Don't allow changing owner's role
      if (targetMembership.role === "owner") {
        return res
          .status(403)
          .json({ error: "Cannot change the owner's role" });
      }

      // Update the member's role
      await prisma.groupMember.updateMany({
        where: {
          groupId,
          userId: targetUserId,
        },
        data: {
          role,
        } as any,
      });

      // Fetch updated membership with user info
      const updatedMembership = await prisma.groupMember.findFirst({
        where: {
          groupId,
          userId: targetUserId,
        },
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      });

      res.json({
        success: true,
        member: updatedMembership,
        message: `Successfully updated ${targetUserId}'s role to ${role}`,
      });
    } catch (error) {
      console.error("Error updating member role:", error);
      res.status(500).json({ error: "Failed to update member role" });
    }
  }
);

// Debug endpoint to list all users (for development/troubleshooting)
app.get("/api/debug/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Register/update user on login (call this when user first authenticates)
app.post("/api/auth/register", async (req, res) => {
  const { uid, email, name, photoURL } = req.body;

  if (!uid) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const user = await prisma.user.upsert({
      where: { id: uid },
      update: {
        // Update user info if they already exist
        email: email ? email.toLowerCase() : undefined,
        name: name || undefined,
      },
      create: {
        // Create new user with proper email
        id: uid,
        email: email ? email.toLowerCase() : uid + "@firebase.local",
        name: name || null,
      },
    });

    // Ensure user has at least one group
    const userGroups = await prisma.groupMember.findMany({
      where: { userId: uid },
    });

    if (userGroups.length === 0) {
      // Create a default "My Friends" group for the user
      const defaultGroup = await prisma.group.create({
        data: {
          name: "My Friends",
          createdById: uid,
          members: {
            create: { userId: uid },
          },
        },
      });

      // Update the creator's role to "owner"
      await prisma.groupMember.updateMany({
        where: {
          groupId: defaultGroup.id,
          userId: uid,
        },
        data: {
          role: "owner",
        } as any,
      });
    }

    res.json({
      success: true,
      user,
      message: "User registered/updated successfully",
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// Fix existing user email (for users who already have placeholder emails)
app.put("/api/auth/fix-user-email", async (req, res) => {
  const { uid, email } = req.body;

  if (!uid || !email) {
    return res.status(400).json({ error: "User ID and email are required" });
  }

  try {
    const user = await prisma.user.update({
      where: { id: uid },
      data: {
        email: email.toLowerCase(),
      },
    });

    res.json({
      success: true,
      user,
      message: `Updated email for user ${uid} to ${email}`,
    });
  } catch (error) {
    console.error("Error updating user email:", error);
    res.status(500).json({ error: "Failed to update user email" });
  }
});

// Get groups that a resource is shared with
app.get(
  "/api/resources/:resourceId/groups",
  authenticateToken,
  async (req, res) => {
    const { resourceId } = req.params;
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    try {
      // Verify user owns this resource
      const resource = await prisma.resource.findUnique({
        where: { id: resourceId },
        select: { ownerId: true },
      });

      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }

      if (resource.ownerId !== userId) {
        return res.status(403).json({ error: "You don't own this resource" });
      }

      // Get groups this resource is shared with
      const sharedGroups = await prisma.resourceSharing.findMany({
        where: { resourceId },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });

      // Add member count for each group
      const groupsWithCounts = await Promise.all(
        sharedGroups.map(async (sharing) => {
          const memberCount = await prisma.groupMember.count({
            where: { groupId: sharing.groupId },
          });

          return {
            ...sharing.group,
            memberCount,
          };
        })
      );

      res.json(groupsWithCounts);
    } catch (error) {
      console.error("Error fetching resource groups:", error);
      res.status(500).json({ error: "Failed to fetch resource groups" });
    }
  }
);

// Add resource to a group
app.post(
  "/api/resources/:resourceId/groups/:groupId",
  authenticateToken,
  async (req, res) => {
    const { resourceId, groupId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    try {
      // Verify user owns this resource
      const resource = await prisma.resource.findUnique({
        where: { id: resourceId },
        select: { ownerId: true },
      });

      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }

      if (resource.ownerId !== userId) {
        return res.status(403).json({ error: "You don't own this resource" });
      }

      // Verify user is a member of the group
      const membership = await prisma.groupMember.findFirst({
        where: {
          userId,
          groupId,
        },
      });

      if (!membership) {
        return res
          .status(403)
          .json({ error: "You're not a member of this group" });
      }

      // Check if resource is already shared with this group
      const existingSharing = await prisma.resourceSharing.findFirst({
        where: {
          resourceId,
          groupId,
        },
      });

      if (existingSharing) {
        return res
          .status(400)
          .json({ error: "Resource is already shared with this group" });
      }

      // Create the sharing relationship
      await prisma.resourceSharing.create({
        data: {
          resourceId,
          groupId,
        },
      });

      res.json({ success: true, message: "Resource added to group" });
    } catch (error) {
      console.error("Error adding resource to group:", error);
      res.status(500).json({ error: "Failed to add resource to group" });
    }
  }
);

// Remove resource from a group
app.delete(
  "/api/resources/:resourceId/groups/:groupId",
  authenticateToken,
  async (req, res) => {
    const { resourceId, groupId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    try {
      // Verify user owns this resource
      const resource = await prisma.resource.findUnique({
        where: { id: resourceId },
        select: { ownerId: true },
      });

      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }

      if (resource.ownerId !== userId) {
        return res.status(403).json({ error: "You don't own this resource" });
      }

      // Remove the sharing relationship
      await prisma.resourceSharing.deleteMany({
        where: {
          resourceId,
          groupId,
        },
      });

      res.json({ success: true, message: "Resource removed from group" });
    } catch (error) {
      console.error("Error removing resource from group:", error);
      res.status(500).json({ error: "Failed to remove resource from group" });
    }
  }
);

// Get user's groups (for sharing existing resources)
app.get("/api/users/:userId/groups", authenticateToken, async (req, res) => {
  const { userId } = req.params;

  try {
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Add memberCount by counting members
    const groupsWithCounts = await Promise.all(
      memberships.map(async (membership) => {
        const memberCount = await prisma.groupMember.count({
          where: { groupId: membership.groupId },
        });

        return {
          ...membership.group,
          memberCount,
        };
      })
    );

    res.json(groupsWithCounts);
  } catch (error) {
    console.error("Error fetching user groups:", error);
    res.status(500).json({ error: "Failed to fetch user groups" });
  }
});

// --- BORROW REQUESTS API --- //

// Create a borrow request
app.post("/api/borrow-requests", authenticateToken, async (req, res) => {
  const { resourceId, borrowerId, groupId, message, startDate, endDate } =
    req.body;

  // Validate required fields (groupId is now optional)
  if (!resourceId || !borrowerId || !startDate || !endDate) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["resourceId", "borrowerId", "startDate", "endDate"],
    });
  }

  try {
    // Parse and validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    if (start < now) {
      return res
        .status(400)
        .json({ error: "Start date cannot be in the past" });
    }

    if (end <= start) {
      return res
        .status(400)
        .json({ error: "End date must be after start date" });
    }

    // Get resource with owner information
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        owner: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Check if requesting user is the owner
    if (resource.ownerId === borrowerId) {
      return res
        .status(400)
        .json({ error: "You cannot borrow your own resource" });
    }

    // If groupId not provided, find a suitable group
    let finalGroupId = groupId;
    if (!finalGroupId) {
      // Find groups where: 1) resource is shared, 2) borrower is a member
      const suitableGroup = await prisma.resourceSharing.findFirst({
        where: {
          resourceId,
          group: {
            members: {
              some: {
                userId: borrowerId,
              },
            },
          },
        },
        select: { groupId: true },
      });

      if (!suitableGroup) {
        return res.status(403).json({
          error: "No suitable group found",
          message:
            "You must be a member of a group where this resource is shared",
        });
      }

      finalGroupId = suitableGroup.groupId;
    } else {
      // If groupId provided, verify resource is shared with the specified group
      const resourceSharing = await prisma.resourceSharing.findFirst({
        where: {
          resourceId,
          groupId: finalGroupId,
        },
      });

      if (!resourceSharing) {
        return res.status(403).json({
          error: "Resource not shared with this group",
          message: "This resource is not available in the specified group",
        });
      }

      // Verify requesting user is a member of the group
      const groupMember = await prisma.groupMember.findFirst({
        where: {
          userId: borrowerId,
          groupId: finalGroupId,
        },
      });

      if (!groupMember) {
        return res.status(403).json({
          error: "Not a group member",
          message:
            "You must be a member of this group to request this resource",
        });
      }
    }

    // Check for overlapping active loans
    const overlappingLoans = await prisma.loan.findMany({
      where: {
        resourceId,
        status: "ACTIVE",
        OR: [
          {
            // Existing loan starts during requested period
            AND: [{ startDate: { lte: end } }, { startDate: { gte: start } }],
          },
          {
            // Existing loan ends during requested period
            AND: [{ endDate: { lte: end } }, { endDate: { gte: start } }],
          },
          {
            // Existing loan spans entire requested period
            AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }],
          },
        ],
      },
    });

    if (overlappingLoans.length > 0) {
      return res.status(409).json({
        error: "Resource unavailable",
        message:
          "This resource is already borrowed during the requested time period",
        conflictingLoans: overlappingLoans.map((loan) => ({
          startDate: loan.startDate,
          endDate: loan.endDate,
        })),
      });
    }

    // Note: Multiple pending requests are now allowed
    // When owner accepts one, overlapping requests will be auto-declined

    // Create the borrow request (using finalGroupId for validation but not storing it)
    const borrowRequest = await prisma.borrowRequest.create({
      data: {
        resourceId,
        borrowerId,
        ownerId: resource.ownerId,
        message: message || null,
        startDate: start,
        endDate: end,
        status: "PENDING",
      },
      include: {
        resource: {
          select: {
            id: true,
            title: true,
            description: true,
            image: true,
          },
        },
        borrower: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      borrowRequest,
      message: "Borrow request created successfully",
    });
  } catch (error) {
    console.error("Error creating borrow request:", error);
    res.status(500).json({ error: "Failed to create borrow request" });
  }
});

// Get borrow requests for owner or borrower
app.get("/api/borrow-requests", authenticateToken, async (req, res) => {
  const userId = req.query.userId as string | undefined;
  const role = req.query.role as "owner" | "borrower" | undefined;
  const status = req.query.status as string | undefined;

  console.log("[DEBUG] GET /api/borrow-requests", { userId, role, status });

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  if (!role || (role !== "owner" && role !== "borrower")) {
    return res.status(400).json({
      error: "role is required and must be 'owner' or 'borrower'",
    });
  }

  try {
    // Build the where clause based on role
    const whereClause: any = {
      [role === "owner" ? "ownerId" : "borrowerId"]: userId,
    };

    // Add status filter if provided
    if (status) {
      whereClause.status = status.toUpperCase();
    }

    const borrowRequests = await prisma.borrowRequest.findMany({
      where: whereClause,
      include: {
        resource: {
          select: {
            id: true,
            title: true,
            description: true,
            image: true,
            status: true,
          },
        },
        borrower: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        loan: {
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            returnedDate: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get group information for each request
    const requestsWithGroups = await Promise.all(
      borrowRequests.map(async (request) => {
        // Find which group this resource is shared with for this borrower
        const userGroups = await prisma.groupMember.findMany({
          where: { userId: request.borrowerId },
          select: { groupId: true },
        });

        const groupIds = userGroups.map((ug) => ug.groupId);

        const sharedGroup = await prisma.resourceSharing.findFirst({
          where: {
            resourceId: request.resourceId,
            groupId: { in: groupIds },
          },
          include: {
            group: {
              select: {
                id: true,
                name: true,
                description: true,
                avatar: true,
              },
            },
          },
        });

        return {
          ...request,
          group: sharedGroup?.group || null,
        };
      })
    );

    res.json({
      success: true,
      requests: requestsWithGroups,
      count: requestsWithGroups.length,
    });
  } catch (error) {
    console.error("Error fetching borrow requests:", error);
    res.status(500).json({ error: "Failed to fetch borrow requests" });
  }
});

// Accept a borrow request (owner only)
app.post(
  "/api/borrow-requests/:id/accept",
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    try {
      // Get the borrow request
      const borrowRequest = await prisma.borrowRequest.findUnique({
        where: { id },
        include: {
          resource: true,
          borrower: {
            select: { id: true, email: true, name: true },
          },
          owner: {
            select: { id: true, email: true, name: true },
          },
        },
      });

      if (!borrowRequest) {
        return res.status(404).json({ error: "Borrow request not found" });
      }

      // Verify user is the owner
      if (borrowRequest.ownerId !== userId) {
        return res.status(403).json({
          error: "Unauthorized",
          message: "Only the resource owner can accept borrow requests",
        });
      }

      // Check if request is already processed
      if (borrowRequest.status !== "PENDING") {
        return res.status(400).json({
          error: "Invalid request status",
          message: `This request has already been ${borrowRequest.status.toLowerCase()}`,
        });
      }

      // Check for active loans during the requested period
      const overlappingLoans = await prisma.loan.findMany({
        where: {
          resourceId: borrowRequest.resourceId,
          status: "ACTIVE",
          OR: [
            {
              AND: [
                { startDate: { lte: borrowRequest.endDate } },
                { startDate: { gte: borrowRequest.startDate } },
              ],
            },
            {
              AND: [
                { endDate: { lte: borrowRequest.endDate } },
                { endDate: { gte: borrowRequest.startDate } },
              ],
            },
            {
              AND: [
                { startDate: { lte: borrowRequest.startDate } },
                { endDate: { gte: borrowRequest.endDate } },
              ],
            },
          ],
        },
      });

      if (overlappingLoans.length > 0) {
        return res.status(409).json({
          error: "Resource unavailable",
          message:
            "This resource is already borrowed during the requested time period",
        });
      }

      // Perform transaction: create loan, update request, update resource, decline overlapping requests
      const result = await prisma.$transaction(async (tx) => {
        // Create the loan
        const loan = await tx.loan.create({
          data: {
            requestId: borrowRequest.id,
            resourceId: borrowRequest.resourceId,
            borrowerId: borrowRequest.borrowerId,
            lenderId: borrowRequest.ownerId,
            startDate: borrowRequest.startDate,
            endDate: borrowRequest.endDate,
            status: "ACTIVE",
          },
          include: {
            borrower: {
              select: { id: true, email: true, name: true },
            },
            lender: {
              select: { id: true, email: true, name: true },
            },
            resource: {
              select: {
                id: true,
                title: true,
                description: true,
                image: true,
                status: true,
              },
            },
          },
        });

        // Update the borrow request status
        const updatedRequest = await tx.borrowRequest.update({
          where: { id },
          data: { status: "APPROVED" },
          include: {
            resource: true,
            borrower: {
              select: { id: true, email: true, name: true },
            },
            owner: {
              select: { id: true, email: true, name: true },
            },
          },
        });

        // Update resource status to BORROWED
        await tx.resource.update({
          where: { id: borrowRequest.resourceId },
          data: {
            status: "BORROWED",
            currentLoanId: loan.id,
          },
        });

        // Auto-decline overlapping pending requests
        const declinedRequests = await tx.borrowRequest.updateMany({
          where: {
            resourceId: borrowRequest.resourceId,
            id: { not: borrowRequest.id },
            status: "PENDING",
            OR: [
              {
                AND: [
                  { startDate: { lte: borrowRequest.endDate } },
                  { startDate: { gte: borrowRequest.startDate } },
                ],
              },
              {
                AND: [
                  { endDate: { lte: borrowRequest.endDate } },
                  { endDate: { gte: borrowRequest.startDate } },
                ],
              },
              {
                AND: [
                  { startDate: { lte: borrowRequest.startDate } },
                  { endDate: { gte: borrowRequest.endDate } },
                ],
              },
            ],
          },
          data: { status: "REJECTED" },
        });

        return { loan, updatedRequest, declinedCount: declinedRequests.count };
      });

      res.json({
        success: true,
        message: "Borrow request accepted successfully",
        borrowRequest: result.updatedRequest,
        loan: result.loan,
        autoDeclinedRequests: result.declinedCount,
      });
    } catch (error) {
      console.error("Error accepting borrow request:", error);
      res.status(500).json({ error: "Failed to accept borrow request" });
    }
  }
);

// Decline a borrow request (owner only)
app.post(
  "/api/borrow-requests/:id/decline",
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    try {
      // Get the borrow request
      const borrowRequest = await prisma.borrowRequest.findUnique({
        where: { id },
        include: {
          resource: true,
          borrower: {
            select: { id: true, email: true, name: true },
          },
          owner: {
            select: { id: true, email: true, name: true },
          },
        },
      });

      if (!borrowRequest) {
        return res.status(404).json({ error: "Borrow request not found" });
      }

      // Verify user is the owner
      if (borrowRequest.ownerId !== userId) {
        return res.status(403).json({
          error: "Unauthorized",
          message: "Only the resource owner can decline borrow requests",
        });
      }

      // Check if request is already processed
      if (borrowRequest.status !== "PENDING") {
        return res.status(400).json({
          error: "Invalid request status",
          message: `This request has already been ${borrowRequest.status.toLowerCase()}`,
        });
      }

      // Update the request status
      const updatedRequest = await prisma.borrowRequest.update({
        where: { id },
        data: { status: "REJECTED" },
        include: {
          resource: {
            select: {
              id: true,
              title: true,
              description: true,
              image: true,
              status: true,
            },
          },
          borrower: {
            select: { id: true, email: true, name: true },
          },
          owner: {
            select: { id: true, email: true, name: true },
          },
        },
      });

      res.json({
        success: true,
        message: "Borrow request declined",
        borrowRequest: updatedRequest,
      });
    } catch (error) {
      console.error("Error declining borrow request:", error);
      res.status(500).json({ error: "Failed to decline borrow request" });
    }
  }
);

// Cancel a borrow request (borrower only)
app.post(
  "/api/borrow-requests/:id/cancel",
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    try {
      // Get the borrow request
      const borrowRequest = await prisma.borrowRequest.findUnique({
        where: { id },
        include: {
          resource: {
            select: {
              id: true,
              title: true,
              description: true,
              image: true,
              status: true,
            },
          },
          borrower: {
            select: { id: true, email: true, name: true },
          },
          owner: {
            select: { id: true, email: true, name: true },
          },
        },
      });

      if (!borrowRequest) {
        return res.status(404).json({ error: "Borrow request not found" });
      }

      // Verify user is the borrower
      if (borrowRequest.borrowerId !== userId) {
        return res.status(403).json({
          error: "Unauthorized",
          message: "Only the borrower can cancel their own request",
        });
      }

      // Check if request can be cancelled
      if (borrowRequest.status !== "PENDING") {
        return res.status(400).json({
          error: "Invalid request status",
          message: `Cannot cancel a request that has been ${borrowRequest.status.toLowerCase()}`,
        });
      }

      // Update the request status
      const updatedRequest = await prisma.borrowRequest.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: {
          resource: {
            select: {
              id: true,
              title: true,
              description: true,
              image: true,
              status: true,
            },
          },
          borrower: {
            select: { id: true, email: true, name: true },
          },
          owner: {
            select: { id: true, email: true, name: true },
          },
        },
      });

      res.json({
        success: true,
        message: "Borrow request cancelled",
        borrowRequest: updatedRequest,
      });
    } catch (error) {
      console.error("Error cancelling borrow request:", error);
      res.status(500).json({ error: "Failed to cancel borrow request" });
    }
  }
);

// Update a borrow request (borrower can update their pending requests)
app.put("/api/borrow-requests/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { userId, startDate, endDate, message } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    // Get the borrow request
    const borrowRequest = await prisma.borrowRequest.findUnique({
      where: { id },
    });

    if (!borrowRequest) {
      return res.status(404).json({ error: "Borrow request not found" });
    }

    // Verify user is the borrower or owner
    if (
      borrowRequest.borrowerId !== userId &&
      borrowRequest.ownerId !== userId
    ) {
      return res.status(403).json({
        error: "Unauthorized",
        message: "Only the borrower or owner can update this request",
      });
    }

    // Check if request can be updated (only pending requests)
    if (borrowRequest.status !== "PENDING") {
      return res.status(400).json({
        error: "Invalid request status",
        message: "Only pending requests can be updated",
      });
    }

    // Validate dates if provided
    const updateData: any = {};

    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({ error: "Invalid start date format" });
      }
      updateData.startDate = start;
    }

    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({ error: "Invalid end date format" });
      }
      updateData.endDate = end;
    }

    // Validate date logic if both are provided or being updated
    const finalStartDate = updateData.startDate || borrowRequest.startDate;
    const finalEndDate = updateData.endDate || borrowRequest.endDate;

    if (finalEndDate <= finalStartDate) {
      return res.status(400).json({
        error: "End date must be after start date",
      });
    }

    if (message !== undefined) {
      updateData.message = message || null;
    }

    // Update the request
    const updatedRequest = await prisma.borrowRequest.update({
      where: { id },
      data: updateData,
      include: {
        resource: {
          select: {
            id: true,
            title: true,
            description: true,
            image: true,
            status: true,
          },
        },
        borrower: {
          select: { id: true, email: true, name: true },
        },
        owner: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    res.json({
      success: true,
      message: "Borrow request updated",
      borrowRequest: updatedRequest,
    });
  } catch (error) {
    console.error("Error updating borrow request:", error);
    res.status(500).json({ error: "Failed to update borrow request" });
  }
});

// Delete a borrow request (borrower or owner can delete old/rejected/cancelled requests)
app.delete("/api/borrow-requests/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    // Get the borrow request
    const borrowRequest = await prisma.borrowRequest.findUnique({
      where: { id },
      include: {
        loan: true, // Include loan to check if it exists
      },
    });

    if (!borrowRequest) {
      return res.status(404).json({ error: "Borrow request not found" });
    }

    console.log("[DEBUG] Delete request:", {
      requestId: id,
      status: borrowRequest.status,
      hasLoan: !!borrowRequest.loan,
      loanStatus: borrowRequest.loan?.status,
    });

    // Verify user is the borrower or owner
    if (
      borrowRequest.borrowerId !== userId &&
      borrowRequest.ownerId !== userId
    ) {
      return res.status(403).json({
        error: "Unauthorized",
        message: "Only the borrower or owner can delete this request",
      });
    }

    // Check if request can be deleted (not APPROVED or active)
    if (borrowRequest.status === "APPROVED") {
      return res.status(400).json({
        error: "Cannot delete approved request",
        message:
          "Approved requests cannot be deleted. Cancel the loan instead.",
      });
    }

    // Check if there's an associated loan - if so, delete it first
    if (borrowRequest.loan) {
      console.log(
        "[DEBUG] Deleting associated loan first:",
        borrowRequest.loan.id
      );
      // Delete the loan first (this should only happen for completed/returned loans)
      await prisma.loan.delete({
        where: { id: borrowRequest.loan.id },
      });
    }

    // Delete the request
    await prisma.borrowRequest.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Borrow request deleted",
    });
  } catch (error) {
    console.error("Error deleting borrow request:", error);
    res.status(500).json({ error: "Failed to delete borrow request" });
  }
});

// --- LOAN LIFECYCLE API --- //

// Request return of a loan (borrower only)
app.post(
  "/api/loans/:id/request-return",
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    try {
      // Get the loan
      const loan = await prisma.loan.findUnique({
        where: { id },
        include: {
          resource: {
            select: {
              id: true,
              title: true,
              description: true,
              image: true,
              status: true,
            },
          },
          borrower: {
            select: { id: true, email: true, name: true },
          },
          lender: {
            select: { id: true, email: true, name: true },
          },
        },
      });

      if (!loan) {
        return res.status(404).json({ error: "Loan not found" });
      }

      // Verify user is the borrower
      if (loan.borrowerId !== userId) {
        return res.status(403).json({
          error: "Unauthorized",
          message: "Only the borrower can request to return this loan",
        });
      }

      // Check if loan is active
      if (loan.status !== "ACTIVE") {
        return res.status(400).json({
          error: "Invalid loan status",
          message: `This loan is already ${loan.status.toLowerCase()}`,
        });
      }

      // Update loan status to PENDING_RETURN_CONFIRMATION
      const updatedLoan = await prisma.loan.update({
        where: { id },
        data: {
          status: "PENDING_RETURN_CONFIRMATION",
          returnedDate: new Date(), // Track when borrower initiated return
        },
        include: {
          resource: {
            select: {
              id: true,
              title: true,
              description: true,
              image: true,
              status: true,
            },
          },
          borrower: {
            select: { id: true, email: true, name: true },
          },
          lender: {
            select: { id: true, email: true, name: true },
          },
        },
      });

      res.json({
        success: true,
        message: "Return requested successfully. Awaiting owner confirmation.",
        loan: updatedLoan,
      });
    } catch (error) {
      console.error("Error requesting loan return:", error);
      res.status(500).json({ error: "Failed to request loan return" });
    }
  }
);

// Confirm return of a loan (lender/owner only)
app.post(
  "/api/loans/:id/confirm-return",
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    try {
      // Get the loan
      const loan = await prisma.loan.findUnique({
        where: { id },
        include: {
          resource: {
            select: {
              id: true,
              title: true,
              description: true,
              image: true,
              status: true,
              currentLoanId: true,
            },
          },
          borrower: {
            select: { id: true, email: true, name: true },
          },
          lender: {
            select: { id: true, email: true, name: true },
          },
        },
      });

      if (!loan) {
        return res.status(404).json({ error: "Loan not found" });
      }

      // Verify user is the lender/owner
      if (loan.lenderId !== userId) {
        return res.status(403).json({
          error: "Unauthorized",
          message: "Only the resource owner can confirm the return",
        });
      }

      // Check if return was initiated by borrower
      if (loan.status !== "PENDING_RETURN_CONFIRMATION") {
        return res.status(400).json({
          error: "Invalid loan status",
          message:
            loan.status === "RETURNED"
              ? "This loan has already been marked as returned"
              : "The borrower must initiate the return first",
        });
      }

      // Perform transaction: update loan status, update resource status, clear currentLoanId
      const result = await prisma.$transaction(async (tx) => {
        // Update loan: set status to RETURNED (returnedDate already set)
        const updatedLoan = await tx.loan.update({
          where: { id },
          data: {
            status: "RETURNED",
          },
          include: {
            borrower: {
              select: { id: true, email: true, name: true },
            },
            lender: {
              select: { id: true, email: true, name: true },
            },
          },
        });

        // Update resource: set status to AVAILABLE and clear currentLoanId
        await tx.resource.update({
          where: { id: loan.resourceId },
          data: {
            status: "AVAILABLE",
            currentLoanId: null,
          },
        });

        return { loan: updatedLoan };
      });

      res.json({
        success: true,
        message: "Return confirmed successfully",
        loan: result.loan,
      });
    } catch (error) {
      console.error("Error confirming return:", error);
      res.status(500).json({ error: "Failed to confirm return" });
    }
  }
);

// Mark item as returned by owner (direct return without borrower request)
app.post(
  "/api/borrow-requests/:id/mark-returned",
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    try {
      // Get the borrow request with its loan
      const borrowRequest = await prisma.borrowRequest.findUnique({
        where: { id },
        include: {
          loan: true,
          resource: true,
        },
      });

      if (!borrowRequest) {
        return res.status(404).json({ error: "Borrow request not found" });
      }

      // Verify user is the owner
      if (borrowRequest.ownerId !== userId) {
        return res.status(403).json({
          error: "Unauthorized",
          message: "Only the resource owner can mark items as returned",
        });
      }

      // Check if request is approved and has an active loan
      if (borrowRequest.status !== "APPROVED" || !borrowRequest.loan) {
        return res.status(400).json({
          error: "Invalid request status",
          message:
            "Only approved requests with active loans can be marked as returned",
        });
      }

      if (borrowRequest.loan.status !== "ACTIVE") {
        return res.status(400).json({
          error: "Loan already completed",
          message: "This loan has already been returned",
        });
      }

      // Perform transaction: update loan status, update resource status, clear currentLoanId
      const result = await prisma.$transaction(async (tx) => {
        // Update loan: set status to RETURNED and set returnedDate
        const updatedLoan = await tx.loan.update({
          where: { id: borrowRequest.loan!.id },
          data: {
            status: "RETURNED",
            returnedDate: new Date(),
          },
          include: {
            borrower: {
              select: { id: true, email: true, name: true },
            },
            lender: {
              select: { id: true, email: true, name: true },
            },
          },
        });

        // Update resource: set status to AVAILABLE and clear currentLoanId
        await tx.resource.update({
          where: { id: borrowRequest.resourceId },
          data: {
            status: "AVAILABLE",
            currentLoanId: null,
          },
        });

        return { loan: updatedLoan };
      });

      res.json({
        success: true,
        message: "Item marked as returned successfully",
        loan: result.loan,
      });
    } catch (error) {
      console.error("Error marking item as returned:", error);
      res.status(500).json({ error: "Failed to mark item as returned" });
    }
  }
);

// Confirm return of a loan (lender/owner only)
app.post(
  "/api/loans/:id/confirm-return",
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    try {
      // Get the loan
      const loan = await prisma.loan.findUnique({
        where: { id },
        include: {
          resource: {
            select: {
              id: true,
              title: true,
              description: true,
              image: true,
              status: true,
              currentLoanId: true,
            },
          },
          borrower: {
            select: { id: true, email: true, name: true },
          },
          lender: {
            select: { id: true, email: true, name: true },
          },
        },
      });

      if (!loan) {
        return res.status(404).json({ error: "Loan not found" });
      }

      // Verify user is the lender/owner
      if (loan.lenderId !== userId) {
        return res.status(403).json({
          error: "Unauthorized",
          message: "Only the resource owner can confirm the return",
        });
      }

      // Check if loan is active
      if (loan.status !== "ACTIVE") {
        return res.status(400).json({
          error: "Invalid loan status",
          message: `This loan is already ${loan.status.toLowerCase()}`,
        });
      }

      // Check if return was requested (returnedDate should be set)
      if (!loan.returnedDate) {
        return res.status(400).json({
          error: "Return not requested",
          message:
            "The borrower must request return before the owner can confirm it",
        });
      }

      // Perform transaction: update loan status, update resource status, clear currentLoanId
      const result = await prisma.$transaction(async (tx) => {
        // Update loan status to RETURNED
        const updatedLoan = await tx.loan.update({
          where: { id },
          data: {
            status: "RETURNED",
          },
          include: {
            resource: {
              select: {
                id: true,
                title: true,
                description: true,
                image: true,
                status: true,
              },
            },
            borrower: {
              select: { id: true, email: true, name: true },
            },
            lender: {
              select: { id: true, email: true, name: true },
            },
          },
        });

        // Update resource: set status to AVAILABLE and clear currentLoanId
        const updatedResource = await tx.resource.update({
          where: { id: loan.resourceId },
          data: {
            status: "AVAILABLE",
            currentLoanId: null,
          },
          select: {
            id: true,
            title: true,
            status: true,
          },
        });

        return { loan: updatedLoan, resource: updatedResource };
      });

      res.json({
        success: true,
        message: "Return confirmed successfully. Resource is now available.",
        loan: result.loan,
        resource: result.resource,
      });
    } catch (error) {
      console.error("Error confirming loan return:", error);
      res.status(500).json({ error: "Failed to confirm loan return" });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
