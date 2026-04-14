import { Request, Response } from "express";

const mockPrisma = {
  group: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  groupMember: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  resourceSharing: { findMany: jest.fn(), deleteMany: jest.fn() },
  user: { findFirst: jest.fn() },
};
jest.mock("../../src/prisma", () => ({
  __esModule: true,
  default: mockPrisma,
}));

import {
  createGroup,
  addMember,
  getGroups,
  getGroupResources,
  getGroupMembers,
  inviteToGroup,
  removeMember,
  updateGroup,
  deleteGroup,
  transferOwnership,
  getGroupDetails,
  removeGroupMember,
  updateMemberRole,
  getUserGroups,
} from "../../src/controllers/groupController";

function mockReqRes(
  body: any = {},
  params: any = {},
  query: any = {},
  uid = "user-123",
) {
  const req = {
    body,
    params,
    query,
    user: { uid },
  } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn(),
  } as unknown as Response;
  return { req, res };
}

describe("groupController", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("createGroup", () => {
    it("returns 400 on invalid input", async () => {
      const { req, res } = mockReqRes({ name: "ab", createdById: "user-123" });
      await createGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 403 when createdById does not match authenticated user", async () => {
      const { req, res } = mockReqRes({
        name: "Test Group",
        createdById: "other-user",
      });
      await createGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("creates a group successfully", async () => {
      const group = { id: "g1", name: "Book Club", createdById: "user-123" };
      mockPrisma.group.create.mockResolvedValue(group);
      mockPrisma.groupMember.updateMany.mockResolvedValue({ count: 1 });

      const { req, res } = mockReqRes({
        name: "Book Club",
        createdById: "user-123",
      });
      await createGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(group);
    });

    it("returns 500 on database error", async () => {
      mockPrisma.group.create.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes({
        name: "Test Group",
        createdById: "user-123",
      });
      await createGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(500);

      jest.restoreAllMocks();
    });
  });

  describe("addMember", () => {
    it("returns 400 when userId is missing", async () => {
      const { req, res } = mockReqRes({}, { groupId: "g1" });
      await addMember(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("adds a member successfully", async () => {
      const member = { id: "m1", groupId: "g1", userId: "u2" };
      mockPrisma.groupMember.findFirst
        .mockResolvedValueOnce({ id: "req1", role: "OWNER" }) // requester is OWNER
        .mockResolvedValueOnce(null); // user not already a member
      mockPrisma.groupMember.create.mockResolvedValue(member);

      const { req, res } = mockReqRes({ userId: "u2" }, { groupId: "g1" });
      await addMember(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(member);
    });

    it("returns 500 on database error", async () => {
      mockPrisma.groupMember.findFirst
        .mockResolvedValueOnce({ id: "req1", role: "OWNER" }) // requester is OWNER
        .mockResolvedValueOnce(null); // user not already a member
      mockPrisma.groupMember.create.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes({ userId: "u2" }, { groupId: "g1" });
      await addMember(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  describe("getGroups", () => {
    it("returns 400 when userId query is missing", async () => {
      const { req, res } = mockReqRes({}, {}, {});
      await getGroups(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns paginated groups for a user", async () => {
      const memberships = [
        {
          role: "OWNER",
          group: { id: "g1", name: "Friends", members: [] },
        },
      ];
      mockPrisma.groupMember.findMany.mockResolvedValue(memberships);
      mockPrisma.groupMember.count.mockResolvedValue(1);

      const { req, res } = mockReqRes({}, {}, { userId: "user-123" });
      await getGroups(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it("returns 500 on database error", async () => {
      mockPrisma.groupMember.findMany.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes({}, {}, { userId: "user-123" });
      await getGroups(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  describe("getGroupResources", () => {
    it("returns resources shared with a group", async () => {
      const shared = [
        { resource: { id: "r1", title: "Drill" } },
        { resource: { id: "r2", title: "Saw" } },
      ];
      mockPrisma.resourceSharing.findMany.mockResolvedValue(shared);

      const { req, res } = mockReqRes({}, { groupId: "g1" });
      await getGroupResources(req, res);

      expect(res.json).toHaveBeenCalledWith([
        { id: "r1", title: "Drill" },
        { id: "r2", title: "Saw" },
      ]);
    });

    it("returns 500 on database error", async () => {
      mockPrisma.resourceSharing.findMany.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes({}, { groupId: "g1" });
      await getGroupResources(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  describe("getGroupMembers", () => {
    it("returns 403 when requester is not a member", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue(null);

      const { req, res } = mockReqRes({}, { groupId: "g1" });
      await getGroupMembers(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns members when requester is a member", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue({ id: "m1" });
      const members = [
        {
          id: "m1",
          userId: "user-123",
          user: { id: "user-123", email: "a@b.com", name: "A" },
        },
      ];
      mockPrisma.groupMember.findMany.mockResolvedValue(members);

      const { req, res } = mockReqRes({}, { groupId: "g1" });
      await getGroupMembers(req, res);
      expect(res.json).toHaveBeenCalledWith(members);
    });

    it("returns 500 on database error", async () => {
      mockPrisma.groupMember.findFirst.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes({}, { groupId: "g1" });
      await getGroupMembers(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  describe("inviteToGroup", () => {
    it("returns 400 when email or invitedBy is missing", async () => {
      const { req, res } = mockReqRes({ email: "a@b.com" }, { groupId: "g1" });
      await inviteToGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 for invalid email format", async () => {
      const { req, res } = mockReqRes(
        { email: "not-email", invitedBy: "user-123" },
        { groupId: "g1" },
      );
      await inviteToGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 403 when inviter is not a group member", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue(null);

      const { req, res } = mockReqRes(
        { email: "b@c.com", invitedBy: "user-123" },
        { groupId: "g1" },
      );
      await inviteToGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 404 when invited user does not exist", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue({ id: "m1" });
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const { req, res } = mockReqRes(
        { email: "b@c.com", invitedBy: "user-123" },
        { groupId: "g1" },
      );
      await inviteToGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when user is already a member", async () => {
      mockPrisma.groupMember.findFirst
        .mockResolvedValueOnce({ id: "m1" }) // inviter membership
        .mockResolvedValueOnce({ id: "m2" }); // existing membership
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "u2",
        email: "b@c.com",
      });

      const { req, res } = mockReqRes(
        { email: "b@c.com", invitedBy: "user-123" },
        { groupId: "g1" },
      );
      await inviteToGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("successfully invites a user", async () => {
      mockPrisma.groupMember.findFirst
        .mockResolvedValueOnce({ id: "m1" }) // inviter membership
        .mockResolvedValueOnce(null); // no existing membership
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "u2",
        email: "b@c.com",
      });
      const newMember = {
        id: "m2",
        groupId: "g1",
        userId: "u2",
        user: { id: "u2", email: "b@c.com", name: "User B" },
      };
      mockPrisma.groupMember.create.mockResolvedValue(newMember);

      const { req, res } = mockReqRes(
        { email: "b@c.com", invitedBy: "user-123" },
        { groupId: "g1" },
      );
      await inviteToGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it("returns 500 on database error", async () => {
      mockPrisma.groupMember.findFirst.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes(
        { email: "b@c.com", invitedBy: "user-123" },
        { groupId: "g1" },
      );
      await inviteToGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  describe("removeMember", () => {
    it("allows self-removal", async () => {
      mockPrisma.groupMember.deleteMany.mockResolvedValue({ count: 1 });

      const { req, res } = mockReqRes(
        {},
        { groupId: "g1", userId: "user-123" },
      );
      await removeMember(req, res);
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it("returns 403 when non-member tries to remove another user", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue(null);

      const { req, res } = mockReqRes(
        {},
        { groupId: "g1", userId: "other-user" },
      );
      await removeMember(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 403 when regular member tries to remove another user", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue({ role: "MEMBER" });

      const { req, res } = mockReqRes(
        {},
        { groupId: "g1", userId: "other-user" },
      );
      await removeMember(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("allows owner to remove another user", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue({ role: "OWNER" });
      mockPrisma.groupMember.deleteMany.mockResolvedValue({ count: 1 });

      const { req, res } = mockReqRes(
        {},
        { groupId: "g1", userId: "other-user" },
      );
      await removeMember(req, res);
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it("allows admin to remove another user", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue({ role: "ADMIN" });
      mockPrisma.groupMember.deleteMany.mockResolvedValue({ count: 1 });

      const { req, res } = mockReqRes(
        {},
        { groupId: "g1", userId: "other-user" },
      );
      await removeMember(req, res);
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it("returns 500 on database error", async () => {
      mockPrisma.groupMember.deleteMany.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes(
        {},
        { groupId: "g1", userId: "user-123" },
      );
      await removeMember(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  describe("updateGroup", () => {
    it("returns 400 when userId is missing", async () => {
      const { req, res } = mockReqRes({ name: "New Name" }, { groupId: "g1" });
      await updateGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 403 when user is not a member", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue(null);

      const { req, res } = mockReqRes(
        { userId: "user-123", name: "New" },
        { groupId: "g1" },
      );
      await updateGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 403 when user is a regular member", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue({
        role: "MEMBER",
        group: { id: "g1", name: "Old", avatar: null, createdById: "other" },
      });

      const { req, res } = mockReqRes(
        { userId: "user-123", name: "New" },
        { groupId: "g1" },
      );
      await updateGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 when no valid fields to update", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue({
        role: "OWNER",
        group: { id: "g1", name: "Old", avatar: null, createdById: "user-123" },
      });

      const { req, res } = mockReqRes(
        { userId: "user-123" },
        { groupId: "g1" },
      );
      await updateGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 for invalid base64 avatar", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue({
        role: "OWNER",
        group: { id: "g1", name: "Old", avatar: null, createdById: "user-123" },
      });

      const { req, res } = mockReqRes(
        { userId: "user-123", avatar: "not-valid-base64" },
        { groupId: "g1" },
      );
      await updateGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("updates group name and description successfully", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue({
        role: "OWNER",
        group: { id: "g1", name: "Old", avatar: null, createdById: "user-123" },
      });
      const updated = { id: "g1", name: "New Name", members: [] };
      mockPrisma.group.update.mockResolvedValue(updated);

      const { req, res } = mockReqRes(
        { userId: "user-123", name: "New Name", description: "Desc" },
        { groupId: "g1" },
      );
      await updateGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it("returns 500 on database error", async () => {
      mockPrisma.groupMember.findFirst.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes(
        { userId: "user-123", name: "New" },
        { groupId: "g1" },
      );
      await updateGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  describe("deleteGroup", () => {
    it("returns 400 when userId is missing", async () => {
      const { req, res } = mockReqRes({}, { groupId: "g1" });
      await deleteGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 403 when user is not a member", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue(null);

      const { req, res } = mockReqRes(
        { userId: "user-123" },
        { groupId: "g1" },
      );
      await deleteGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 403 when user is not the owner", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue({
        id: "m1",
        role: "ADMIN",
      });

      const { req, res } = mockReqRes(
        { userId: "user-123" },
        { groupId: "g1" },
      );
      await deleteGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 404 when group not found", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue({
        id: "m1",
        role: "OWNER",
      });
      mockPrisma.group.findUnique.mockResolvedValue(null);

      const { req, res } = mockReqRes(
        { userId: "user-123" },
        { groupId: "g1" },
      );
      await deleteGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deletes group successfully", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue({
        id: "m1",
        role: "OWNER",
      });
      mockPrisma.group.findUnique.mockResolvedValue({ name: "My Group" });
      mockPrisma.resourceSharing.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.groupMember.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.group.delete.mockResolvedValue({});

      const { req, res } = mockReqRes(
        { userId: "user-123" },
        { groupId: "g1" },
      );
      await deleteGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it("returns 500 on database error", async () => {
      mockPrisma.groupMember.findFirst.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes(
        { userId: "user-123" },
        { groupId: "g1" },
      );
      await deleteGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  describe("transferOwnership", () => {
    it("returns 400 when IDs are missing", async () => {
      const { req, res } = mockReqRes(
        { currentOwnerId: "user-123" },
        { groupId: "g1" },
      );
      await transferOwnership(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 403 when current owner is not a member", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue(null);

      const { req, res } = mockReqRes(
        { currentOwnerId: "user-123", newOwnerId: "u2" },
        { groupId: "g1" },
      );
      await transferOwnership(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 403 when user is not the owner", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue({
        id: "m1",
        role: "ADMIN",
      });

      const { req, res } = mockReqRes(
        { currentOwnerId: "user-123", newOwnerId: "u2" },
        { groupId: "g1" },
      );
      await transferOwnership(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 when new owner is not a member", async () => {
      mockPrisma.groupMember.findFirst
        .mockResolvedValueOnce({ id: "m1", role: "OWNER" }) // current owner
        .mockResolvedValueOnce(null); // new owner not found

      const { req, res } = mockReqRes(
        { currentOwnerId: "user-123", newOwnerId: "u2" },
        { groupId: "g1" },
      );
      await transferOwnership(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("transfers ownership successfully", async () => {
      mockPrisma.groupMember.findFirst
        .mockResolvedValueOnce({ id: "m1", role: "OWNER" })
        .mockResolvedValueOnce({
          id: "m2",
          user: { email: "b@c.com", name: "User B" },
        });
      mockPrisma.groupMember.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.group.update.mockResolvedValue({ id: "g1", members: [] });

      const { req, res } = mockReqRes(
        { currentOwnerId: "user-123", newOwnerId: "u2" },
        { groupId: "g1" },
      );
      await transferOwnership(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it("returns 500 on database error", async () => {
      mockPrisma.groupMember.findFirst.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes(
        { currentOwnerId: "user-123", newOwnerId: "u2" },
        { groupId: "g1" },
      );
      await transferOwnership(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  describe("getGroupDetails", () => {
    it("returns 400 when userId query is missing", async () => {
      const { req, res } = mockReqRes({}, { groupId: "g1" }, {});
      await getGroupDetails(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when group not found", async () => {
      mockPrisma.group.findUnique.mockResolvedValue(null);

      const { req, res } = mockReqRes(
        {},
        { groupId: "g1" },
        { userId: "user-123" },
      );
      await getGroupDetails(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when user is not a member", async () => {
      mockPrisma.group.findUnique.mockResolvedValue({
        id: "g1",
        name: "Test",
        createdById: "other",
        members: [{ userId: "other", user: {} }],
        resources: [],
      });

      const { req, res } = mockReqRes(
        {},
        { groupId: "g1" },
        { userId: "user-123" },
      );
      await getGroupDetails(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns group details with permissions", async () => {
      mockPrisma.group.findUnique.mockResolvedValue({
        id: "g1",
        name: "Test",
        createdById: "user-123",
        members: [{ userId: "user-123", user: { id: "user-123" } }],
        resources: [{ resource: { id: "r1" } }],
      });

      const { req, res } = mockReqRes(
        {},
        { groupId: "g1" },
        { userId: "user-123" },
      );
      await getGroupDetails(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          memberCount: 1,
          sharedResourcesCount: 1,
          userPermissions: expect.objectContaining({
            canEdit: true,
            canDelete: true,
          }),
        }),
      );
    });

    it("returns 500 on database error", async () => {
      mockPrisma.group.findUnique.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes(
        {},
        { groupId: "g1" },
        { userId: "user-123" },
      );
      await getGroupDetails(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  describe("removeGroupMember", () => {
    it("returns 400 when IDs are missing", async () => {
      const { req, res } = mockReqRes(
        { userId: "user-123" },
        { groupId: "g1" },
      );
      await removeGroupMember(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when group not found", async () => {
      mockPrisma.group.findUnique.mockResolvedValue(null);

      const { req, res } = mockReqRes(
        { userId: "user-123", targetUserId: "u2" },
        { groupId: "g1" },
      );
      await removeGroupMember(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when user lacks permission", async () => {
      mockPrisma.group.findUnique.mockResolvedValue({
        id: "g1",
        createdById: "other",
      });

      const { req, res } = mockReqRes(
        { userId: "user-123", targetUserId: "u2" },
        { groupId: "g1" },
      );
      await removeGroupMember(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 403 when trying to remove the creator", async () => {
      mockPrisma.group.findUnique.mockResolvedValue({
        id: "g1",
        createdById: "u2",
      });

      const { req, res } = mockReqRes(
        { userId: "user-123", targetUserId: "u2" },
        { groupId: "g1" },
      );
      await removeGroupMember(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 404 when target is not a member", async () => {
      mockPrisma.group.findUnique.mockResolvedValue({
        id: "g1",
        createdById: "user-123",
      });
      mockPrisma.groupMember.findFirst.mockResolvedValue(null);

      const { req, res } = mockReqRes(
        { userId: "user-123", targetUserId: "u2" },
        { groupId: "g1" },
      );
      await removeGroupMember(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("removes member successfully (by owner)", async () => {
      mockPrisma.group.findUnique.mockResolvedValue({
        id: "g1",
        createdById: "user-123",
      });
      mockPrisma.groupMember.findFirst.mockResolvedValue({
        id: "m2",
        user: { email: "b@c.com", name: "User B" },
      });
      mockPrisma.groupMember.deleteMany.mockResolvedValue({ count: 1 });

      const { req, res } = mockReqRes(
        { userId: "user-123", targetUserId: "u2" },
        { groupId: "g1" },
      );
      await removeGroupMember(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it("allows self-leave", async () => {
      mockPrisma.group.findUnique.mockResolvedValue({
        id: "g1",
        createdById: "other",
      });
      mockPrisma.groupMember.findFirst.mockResolvedValue({
        id: "m1",
        user: { email: "a@b.com", name: "User A" },
      });
      mockPrisma.groupMember.deleteMany.mockResolvedValue({ count: 1 });

      const { req, res } = mockReqRes(
        { userId: "user-123", targetUserId: "user-123" },
        { groupId: "g1" },
      );
      await removeGroupMember(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("left") }),
      );
    });

    it("returns 500 on database error", async () => {
      mockPrisma.group.findUnique.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes(
        { userId: "user-123", targetUserId: "u2" },
        { groupId: "g1" },
      );
      await removeGroupMember(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  describe("updateMemberRole", () => {
    it("returns 400 when requesterId or role is missing", async () => {
      const { req, res } = mockReqRes(
        { requesterId: "user-123" },
        { groupId: "g1", userId: "u2" },
      );
      await updateMemberRole(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 for invalid role", async () => {
      const { req, res } = mockReqRes(
        { requesterId: "user-123", role: "superadmin" },
        { groupId: "g1", userId: "u2" },
      );
      await updateMemberRole(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 403 when requester is not a member", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue(null);

      const { req, res } = mockReqRes(
        { requesterId: "user-123", role: "ADMIN" },
        { groupId: "g1", userId: "u2" },
      );
      await updateMemberRole(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 403 when requester is not the owner", async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue({
        id: "m1",
        role: "ADMIN",
      });

      const { req, res } = mockReqRes(
        { requesterId: "user-123", role: "ADMIN" },
        { groupId: "g1", userId: "u2" },
      );
      await updateMemberRole(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 404 when target is not a member", async () => {
      mockPrisma.groupMember.findFirst
        .mockResolvedValueOnce({ id: "m1", role: "OWNER" })
        .mockResolvedValueOnce(null);

      const { req, res } = mockReqRes(
        { requesterId: "user-123", role: "ADMIN" },
        { groupId: "g1", userId: "u2" },
      );
      await updateMemberRole(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when trying to change the owner role", async () => {
      mockPrisma.groupMember.findFirst
        .mockResolvedValueOnce({ id: "m1", role: "OWNER" })
        .mockResolvedValueOnce({ id: "m2", role: "OWNER" });

      const { req, res } = mockReqRes(
        { requesterId: "user-123", role: "ADMIN" },
        { groupId: "g1", userId: "u2" },
      );
      await updateMemberRole(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("updates role successfully", async () => {
      mockPrisma.groupMember.findFirst
        .mockResolvedValueOnce({ id: "m1", role: "OWNER" }) // requester
        .mockResolvedValueOnce({ id: "m2", role: "MEMBER" }) // target
        .mockResolvedValueOnce({
          id: "m2",
          role: "ADMIN",
          user: { id: "u2", email: "b@c.com", name: "B" },
        }); // updated
      mockPrisma.groupMember.updateMany.mockResolvedValue({ count: 1 });

      const { req, res } = mockReqRes(
        { requesterId: "user-123", role: "ADMIN" },
        { groupId: "g1", userId: "u2" },
      );
      await updateMemberRole(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it("returns 500 on database error", async () => {
      mockPrisma.groupMember.findFirst.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes(
        { requesterId: "user-123", role: "ADMIN" },
        { groupId: "g1", userId: "u2" },
      );
      await updateMemberRole(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  describe("getUserGroups", () => {
    it("returns groups with member counts", async () => {
      mockPrisma.groupMember.findMany.mockResolvedValue([
        { groupId: "g1", group: { id: "g1", name: "Friends", avatar: null } },
      ]);
      mockPrisma.groupMember.count.mockResolvedValue(3);

      const { req, res } = mockReqRes({}, { userId: "user-123" });
      await getUserGroups(req, res);

      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({ id: "g1", memberCount: 3 }),
      ]);
    });

    it("returns 500 on database error", async () => {
      mockPrisma.groupMember.findMany.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes({}, { userId: "user-123" });
      await getUserGroups(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });
});
