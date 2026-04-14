import { Request, Response } from "express";
import { GroupRole } from "@prisma/client";
import prisma from "../prisma";
import {
  validateGroupInput,
  validateImageInput,
  sanitizeString,
  validateEmail,
} from "../utils/validation";

// POST /api/groups
export async function createGroup(req: Request, res: Response) {
  const { name, createdById } = req.body;
  const authenticatedUserId = (req as any).user.uid;

  const sanitizedName = sanitizeString(name, 100);

  const validation = validateGroupInput({ name: sanitizedName, createdById });
  if (!validation.valid) {
    return res.status(400).json({ error: validation.errors.join(", ") });
  }

  if (createdById !== authenticatedUserId) {
    return res
      .status(403)
      .json({ error: "You can only create groups for yourself" });
  }

  try {
    const group = await prisma.group.create({
      data: {
        name: sanitizedName,
        createdById,
        members: {
          create: { userId: createdById },
        },
      },
    });

    await prisma.groupMember.updateMany({
      where: {
        groupId: group.id,
        userId: createdById,
      },
      data: {
        role: GroupRole.OWNER,
      },
    });

    res.status(201).json(group);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Failed to create group" });
  }
}

// POST /api/groups/:groupId/add-member
export async function addMember(req: Request, res: Response) {
  const { groupId } = req.params;
  const { userId } = req.body;
  const requestingUserId = (req as any).user.uid;

  if (!userId) return res.status(400).json({ error: "User ID required" });

  try {
    const requesterMembership = await prisma.groupMember.findFirst({
      where: { groupId, userId: requestingUserId },
    });

    if (
      !requesterMembership ||
      (requesterMembership.role !== GroupRole.OWNER &&
        requesterMembership.role !== GroupRole.ADMIN)
    ) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only group owners and admins can add members",
      });
    }

    const existingMembership = await prisma.groupMember.findFirst({
      where: { groupId, userId },
    });

    if (existingMembership) {
      return res
        .status(409)
        .json({ error: "User is already a member of this group" });
    }

    const member = await prisma.groupMember.create({
      data: { groupId, userId },
    });
    res.status(201).json(member);
  } catch (error) {
    console.error("Error adding member:", error);
    res.status(500).json({ error: "Failed to add member" });
  }
}

// GET /api/groups
export async function getGroups(req: Request, res: Response) {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const skip = (page - 1) * limit;

  try {
    const [memberships, total] = await Promise.all([
      prisma.groupMember.findMany({
        where: { userId },
        skip,
        take: limit,
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
      }),
      prisma.groupMember.count({ where: { userId } }),
    ]);

    const groupsWithRole = memberships.map((membership) => {
      return {
        ...membership.group,
        userRole: membership.role,
        memberCount: membership.group.members.length,
      };
    });

    res.json({
      data: groupsWithRole,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
}

// GET /api/groups/:groupId/resources
export async function getGroupResources(req: Request, res: Response) {
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

// GET /api/groups/:groupId/members
export async function getGroupMembers(req: Request, res: Response) {
  const { groupId } = req.params;
  const requestingUserId = (req as any).user.uid;

  try {
    const requesterMembership = await prisma.groupMember.findFirst({
      where: { groupId, userId: requestingUserId },
    });

    if (!requesterMembership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group" });
    }

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
}

// POST /api/groups/:groupId/invite
export async function inviteToGroup(req: Request, res: Response) {
  const { groupId } = req.params;
  const { email, invitedBy } = req.body;

  if (!email || !invitedBy) {
    return res.status(400).json({ error: "Email and invitedBy are required" });
  }

  try {
    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

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
}

// DELETE /api/groups/:groupId/members/:userId
export async function removeMember(req: Request, res: Response) {
  const { groupId, userId } = req.params;
  const requestingUserId = (req as any).user.uid;

  try {
    if (userId !== requestingUserId) {
      const requesterMembership = await prisma.groupMember.findFirst({
        where: { groupId, userId: requestingUserId },
        select: { role: true },
      });

      if (!requesterMembership) {
        return res
          .status(403)
          .json({ error: "You are not a member of this group" });
      }

      const canRemove =
        requesterMembership.role === GroupRole.OWNER ||
        requesterMembership.role === GroupRole.ADMIN;
      if (!canRemove) {
        return res.status(403).json({
          error: "Only group owners and admins can remove other members",
        });
      }
    }

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

// PUT /api/groups/:groupId
export async function updateGroup(req: Request, res: Response) {
  const { groupId } = req.params;
  const { name, avatar, description, userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
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

    const canEdit =
      membership.role === GroupRole.OWNER ||
      membership.role === GroupRole.ADMIN;
    if (!canEdit) {
      return res
        .status(403)
        .json({ error: "You don't have permission to edit this group" });
    }

    const updateData: any = {};
    if (name !== undefined && name.trim()) updateData.name = name.trim();
    if (avatar !== undefined) {
      if (avatar && typeof avatar === "string") {
        const avatarValidation = validateImageInput(avatar);
        if (!avatarValidation.valid) {
          return res.status(400).json({ error: avatarValidation.error });
        }
      }
      updateData.avatar = avatar;
    }
    if (description !== undefined) updateData.description = description;

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
}

// DELETE /api/groups/:groupId
export async function deleteGroup(req: Request, res: Response) {
  const { groupId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
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

    if (userMembership.role !== GroupRole.OWNER) {
      return res
        .status(403)
        .json({ error: "Only the group owner can delete this group" });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    await prisma.resourceSharing.deleteMany({
      where: { groupId },
    });

    await prisma.groupMember.deleteMany({
      where: { groupId },
    });

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
}

// PUT /api/groups/:groupId/transfer-ownership
export async function transferOwnership(req: Request, res: Response) {
  const { groupId } = req.params;
  const { currentOwnerId, newOwnerId } = req.body;

  if (!currentOwnerId || !newOwnerId) {
    return res
      .status(400)
      .json({ error: "Current owner ID and new owner ID are required" });
  }

  try {
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

    if (currentOwnerMembership.role !== GroupRole.OWNER) {
      return res
        .status(403)
        .json({ error: "Only the group owner can transfer ownership" });
    }

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

    await prisma.groupMember.updateMany({
      where: {
        groupId,
        userId: currentOwnerId,
      },
      data: {
        role: GroupRole.ADMIN,
      },
    });

    await prisma.groupMember.updateMany({
      where: {
        groupId,
        userId: newOwnerId,
      },
      data: {
        role: GroupRole.OWNER,
      },
    });

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

// GET /api/groups/:groupId/details
export async function getGroupDetails(req: Request, res: Response) {
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

    const userMembership = group.members.find((m) => m.userId === userId);
    if (!userMembership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group" });
    }

    const isCreator = group.createdById === userId;
    const permissions = {
      canEdit: isCreator,
      canDelete: isCreator,
      canInvite: true,
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
}

// DELETE /api/groups/:groupId/remove-member
export async function removeGroupMember(req: Request, res: Response) {
  const { groupId } = req.params;
  const { userId, targetUserId } = req.body;

  if (!userId || !targetUserId) {
    return res
      .status(400)
      .json({ error: "User ID and target user ID are required" });
  }

  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const canRemove = userId === targetUserId || group.createdById === userId;

    if (!canRemove) {
      return res
        .status(403)
        .json({ error: "You don't have permission to remove this member" });
    }

    if (targetUserId === group.createdById && userId !== targetUserId) {
      return res
        .status(403)
        .json({ error: "Group creator cannot be removed by others" });
    }

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

// PUT /api/groups/:groupId/members/:userId/role
export async function updateMemberRole(req: Request, res: Response) {
  const { groupId, userId: targetUserId } = req.params;
  const requesterId = (req as any).user.uid;
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ error: "Role is required" });
  }

  if (![GroupRole.MEMBER, GroupRole.ADMIN].includes(role)) {
    return res.status(400).json({ error: "Role must be 'MEMBER' or 'ADMIN'" });
  }

  try {
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

    if (requesterMembership.role !== GroupRole.OWNER) {
      return res
        .status(403)
        .json({ error: "Only group owners can assign admin rights" });
    }

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

    if (targetMembership.role === GroupRole.OWNER) {
      return res.status(403).json({ error: "Cannot change the owner's role" });
    }

    await prisma.groupMember.updateMany({
      where: {
        groupId,
        userId: targetUserId,
      },
      data: {
        role,
      },
    });

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

// GET /api/users/:userId/groups
export async function getUserGroups(req: Request, res: Response) {
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

    const groupsWithCounts = await Promise.all(
      memberships.map(async (membership) => {
        const memberCount = await prisma.groupMember.count({
          where: { groupId: membership.groupId },
        });

        return {
          ...membership.group,
          memberCount,
        };
      }),
    );

    res.json(groupsWithCounts);
  } catch (error) {
    console.error("Error fetching user groups:", error);
    res.status(500).json({ error: "Failed to fetch user groups" });
  }
}
