import { Request, Response } from "express";
import prisma from "../prisma";

// GET /api/debug/users (dev only)
export async function debugListUsers(req: Request, res: Response) {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Endpoint not available" });
  }

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
}

// POST /api/auth/register
export async function registerUser(req: Request, res: Response) {
  const authenticatedUid = (req as any).user.uid;
  const { uid, email, name } = req.body;

  if (!uid) {
    return res.status(400).json({ error: "User ID is required" });
  }

  if (uid !== authenticatedUid) {
    return res.status(403).json({ error: "You can only register yourself" });
  }

  try {
    const user = await prisma.user.upsert({
      where: { id: uid },
      update: {
        email: email ? email.toLowerCase() : undefined,
        name: name || undefined,
      },
      create: {
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
      const defaultGroup = await prisma.group.create({
        data: {
          name: "My Friends",
          createdById: uid,
          members: {
            create: { userId: uid },
          },
        },
      });

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
}

// PUT /api/auth/fix-user-email
export async function fixUserEmail(req: Request, res: Response) {
  const authenticatedUid = (req as any).user.uid;
  const { uid, email } = req.body;

  if (!uid || !email) {
    return res.status(400).json({ error: "User ID and email are required" });
  }

  if (uid !== authenticatedUid) {
    return res
      .status(403)
      .json({ error: "You can only update your own email" });
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
}
