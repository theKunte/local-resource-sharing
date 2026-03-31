import { Request, Response } from "express";

const mockPrisma = {
  resource: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  resourceSharing: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  groupMember: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
  user: { upsert: jest.fn() },
  group: { create: jest.fn() },
  borrowRequest: { count: jest.fn(), deleteMany: jest.fn() },
  loan: { deleteMany: jest.fn() },
};
jest.mock("../../src/prisma", () => ({
  __esModule: true,
  default: mockPrisma,
}));

import {
  getResources,
  createResource,
  getPendingRequestsCount,
  updateResource,
  deleteResource,
  getResourceGroups,
  addResourceToGroup,
  removeResourceFromGroup,
} from "../../src/controllers/resourceController";

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
    headers: {},
  } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn(),
  } as unknown as Response;
  return { req, res };
}

describe("resourceController", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getResources", () => {
    it("returns empty data when no userId or ownerId", async () => {
      const { req, res } = mockReqRes({}, {}, {});
      await getResources(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [],
          pagination: expect.objectContaining({ total: 0 }),
        }),
      );
    });

    it("returns resources filtered by ownerId", async () => {
      const resources = [{ id: "r1", title: "Drill", ownerId: "user-123" }];
      mockPrisma.resource.findMany.mockResolvedValue(resources);
      mockPrisma.resource.count.mockResolvedValue(1);

      const { req, res } = mockReqRes({}, {}, { ownerId: "user-123" });
      await getResources(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: resources,
          pagination: expect.objectContaining({ total: 1 }),
        }),
      );
    });

    it("paginates results with limit capped at 100", async () => {
      mockPrisma.resource.findMany.mockResolvedValue([]);
      mockPrisma.resource.count.mockResolvedValue(0);

      const { req, res } = mockReqRes(
        {},
        {},
        { ownerId: "u1", page: "1", limit: "200" },
      );
      await getResources(req, res);

      expect(mockPrisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it("returns resources shared via groups for userId", async () => {
      mockPrisma.groupMember.findMany.mockResolvedValue([{ groupId: "g1" }]);
      mockPrisma.resourceSharing.findMany.mockResolvedValue([
        {
          resource: { id: "r1", title: "Drill", ownerId: "other-user" },
        },
      ]);

      const { req, res } = mockReqRes({}, {}, { user: "user-123" });
      await getResources(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ id: "r1" })],
          pagination: expect.objectContaining({ total: 1 }),
        }),
      );
    });

    it("excludes own resources from shared results", async () => {
      mockPrisma.groupMember.findMany.mockResolvedValue([{ groupId: "g1" }]);
      mockPrisma.resourceSharing.findMany.mockResolvedValue([
        { resource: { id: "r1", title: "My Drill", ownerId: "user-123" } },
      ]);

      const { req, res } = mockReqRes({}, {}, { user: "user-123" });
      await getResources(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [],
          pagination: expect.objectContaining({ total: 0 }),
        }),
      );
    });

    it("returns 500 on database error", async () => {
      mockPrisma.resource.findMany.mockRejectedValue(new Error("DB fail"));
      mockPrisma.resource.count.mockRejectedValue(new Error("DB fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes({}, {}, { ownerId: "u1" });
      await getResources(req, res);
      expect(res.status).toHaveBeenCalledWith(500);

      jest.restoreAllMocks();
    });
  });

  describe("createResource", () => {
    const validBody = {
      title: "Power Drill",
      description: "A great power drill for home projects",
      ownerId: "user-123",
      image: "data:image/png;base64,iVBORw==",
    };

    it("returns 400 on invalid input", async () => {
      const { req, res } = mockReqRes({
        title: "ab",
        description: "short",
        ownerId: "",
      });
      await createResource(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 403 when ownerId does not match authenticated user", async () => {
      const { req, res } = mockReqRes(
        { ...validBody, ownerId: "other-user" },
        {},
        {},
        "user-123",
      );
      await createResource(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("creates a resource successfully", async () => {
      const resource = { id: "r1", ...validBody };
      mockPrisma.user.upsert.mockResolvedValue({ id: "user-123" });
      mockPrisma.groupMember.findMany.mockResolvedValue([{ groupId: "g1" }]);
      mockPrisma.resource.create.mockResolvedValue(resource);

      const { req, res } = mockReqRes(validBody);
      await createResource(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(resource);
    });

    it("creates default group when user has no groups", async () => {
      const resource = { id: "r1", ...validBody };
      mockPrisma.user.upsert.mockResolvedValue({ id: "user-123" });
      mockPrisma.groupMember.findMany.mockResolvedValue([]); // no groups
      mockPrisma.group.create.mockResolvedValue({
        id: "g-default",
        name: "My Friends",
      });
      mockPrisma.groupMember.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.resource.create.mockResolvedValue(resource);

      const { req, res } = mockReqRes(validBody);
      await createResource(req, res);

      expect(mockPrisma.group.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: "My Friends" }),
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 500 on database error", async () => {
      mockPrisma.user.upsert.mockRejectedValue(new Error("DB fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes(validBody);
      await createResource(req, res);
      expect(res.status).toHaveBeenCalledWith(500);

      jest.restoreAllMocks();
    });
  });

  describe("getPendingRequestsCount", () => {
    it("returns pending count for a resource", async () => {
      mockPrisma.borrowRequest.count.mockResolvedValue(3);

      const { req, res } = mockReqRes({}, { id: "r1" });
      await getPendingRequestsCount(req, res);

      expect(res.json).toHaveBeenCalledWith({
        resourceId: "r1",
        pendingRequestsCount: 3,
      });
    });

    it("returns 500 on database error", async () => {
      mockPrisma.borrowRequest.count.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes({}, { id: "r1" });
      await getPendingRequestsCount(req, res);
      expect(res.status).toHaveBeenCalledWith(500);

      jest.restoreAllMocks();
    });
  });

  describe("updateResource", () => {
    it("returns 400 when title is too short", async () => {
      const { req, res } = mockReqRes(
        { title: "ab", description: "A valid description here" },
        { id: "r1" },
      );
      await updateResource(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when description is too short", async () => {
      const { req, res } = mockReqRes(
        { title: "Valid Title", description: "short" },
        { id: "r1" },
      );
      await updateResource(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when title is too long", async () => {
      const { req, res } = mockReqRes(
        { title: "x".repeat(201), description: "A valid description here" },
        { id: "r1" },
      );
      await updateResource(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when resource not found", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue(null);

      const { req, res } = mockReqRes(
        { title: "Valid Title", description: "A valid description here" },
        { id: "r1" },
      );
      await updateResource(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when user does not own the resource", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({
        id: "r1",
        ownerId: "other-user",
      });

      const { req, res } = mockReqRes(
        { title: "New Title", description: "A valid description here" },
        { id: "r1" },
      );
      await updateResource(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("updates resource successfully", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({
        id: "r1",
        ownerId: "user-123",
      });
      const updated = {
        id: "r1",
        title: "New Title",
        description: "Updated description",
        ownerId: "user-123",
      };
      mockPrisma.resource.update.mockResolvedValue(updated);

      const { req, res } = mockReqRes(
        { title: "New Title", description: "Updated description" },
        { id: "r1" },
      );
      await updateResource(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it("returns 404 on database error during update", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({
        id: "r1",
        ownerId: "user-123",
      });
      mockPrisma.resource.update.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes(
        { title: "New Title", description: "Updated description" },
        { id: "r1" },
      );
      await updateResource(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      jest.restoreAllMocks();
    });
  });

  describe("deleteResource", () => {
    it("returns 404 when resource not found", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue(null);

      const { req, res } = mockReqRes({}, { id: "r1" });
      await deleteResource(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when user does not own the resource", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({
        ownerId: "other-user",
        currentLoanId: null,
      });

      const { req, res } = mockReqRes({}, { id: "r1" });
      await deleteResource(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 when resource is currently borrowed", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({
        ownerId: "user-123",
        currentLoanId: "loan-1",
      });

      const { req, res } = mockReqRes({}, { id: "r1" });
      await deleteResource(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deletes resource and all related records successfully", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({
        ownerId: "user-123",
        currentLoanId: null,
      });
      mockPrisma.loan.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.borrowRequest.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.resourceSharing.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.resource.delete.mockResolvedValue({});

      const { req, res } = mockReqRes({}, { id: "r1" });
      await deleteResource(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalled();
      expect(mockPrisma.loan.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.borrowRequest.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.resourceSharing.deleteMany).toHaveBeenCalled();
    });

    it("returns 500 on database error", async () => {
      mockPrisma.resource.findUnique.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes({}, { id: "r1" });
      await deleteResource(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  describe("getResourceGroups", () => {
    it("returns 400 when userId is missing", async () => {
      const { req, res } = mockReqRes({}, { resourceId: "r1" }, {});
      await getResourceGroups(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when resource not found", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue(null);

      const { req, res } = mockReqRes(
        {},
        { resourceId: "r1" },
        { userId: "user-123" },
      );
      await getResourceGroups(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when user does not own the resource", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({
        ownerId: "other-user",
      });

      const { req, res } = mockReqRes(
        {},
        { resourceId: "r1" },
        { userId: "user-123" },
      );
      await getResourceGroups(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns groups with member counts", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({ ownerId: "user-123" });
      mockPrisma.resourceSharing.findMany.mockResolvedValue([
        { groupId: "g1", group: { id: "g1", name: "Friends", avatar: null } },
      ]);
      mockPrisma.groupMember.count.mockResolvedValue(5);

      const { req, res } = mockReqRes(
        {},
        { resourceId: "r1" },
        { userId: "user-123" },
      );
      await getResourceGroups(req, res);

      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({ id: "g1", memberCount: 5 }),
      ]);
    });

    it("returns 500 on database error", async () => {
      mockPrisma.resource.findUnique.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes(
        {},
        { resourceId: "r1" },
        { userId: "user-123" },
      );
      await getResourceGroups(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  describe("addResourceToGroup", () => {
    it("returns 400 when userId is missing", async () => {
      const { req, res } = mockReqRes({}, { resourceId: "r1", groupId: "g1" });
      await addResourceToGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when resource not found", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue(null);

      const { req, res } = mockReqRes(
        { userId: "user-123" },
        { resourceId: "r1", groupId: "g1" },
      );
      await addResourceToGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when user does not own the resource", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({
        ownerId: "other-user",
      });

      const { req, res } = mockReqRes(
        { userId: "user-123" },
        { resourceId: "r1", groupId: "g1" },
      );
      await addResourceToGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 403 when user is not a group member", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({ ownerId: "user-123" });
      mockPrisma.groupMember.findFirst.mockResolvedValue(null);

      const { req, res } = mockReqRes(
        { userId: "user-123" },
        { resourceId: "r1", groupId: "g1" },
      );
      await addResourceToGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 when resource already shared with group", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({ ownerId: "user-123" });
      mockPrisma.groupMember.findFirst.mockResolvedValue({ id: "m1" });
      mockPrisma.resourceSharing.findFirst.mockResolvedValue({ id: "s1" });

      const { req, res } = mockReqRes(
        { userId: "user-123" },
        { resourceId: "r1", groupId: "g1" },
      );
      await addResourceToGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("adds resource to group successfully", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({ ownerId: "user-123" });
      mockPrisma.groupMember.findFirst.mockResolvedValue({ id: "m1" });
      mockPrisma.resourceSharing.findFirst.mockResolvedValue(null);
      mockPrisma.resourceSharing.create.mockResolvedValue({ id: "s1" });

      const { req, res } = mockReqRes(
        { userId: "user-123" },
        { resourceId: "r1", groupId: "g1" },
      );
      await addResourceToGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it("returns 500 on database error", async () => {
      mockPrisma.resource.findUnique.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes(
        { userId: "user-123" },
        { resourceId: "r1", groupId: "g1" },
      );
      await addResourceToGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  describe("removeResourceFromGroup", () => {
    it("returns 400 when userId is missing", async () => {
      const { req, res } = mockReqRes({}, { resourceId: "r1", groupId: "g1" });
      await removeResourceFromGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when resource not found", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue(null);

      const { req, res } = mockReqRes(
        { userId: "user-123" },
        { resourceId: "r1", groupId: "g1" },
      );
      await removeResourceFromGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when user does not own the resource", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({
        ownerId: "other-user",
      });

      const { req, res } = mockReqRes(
        { userId: "user-123" },
        { resourceId: "r1", groupId: "g1" },
      );
      await removeResourceFromGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("removes resource from group successfully", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({ ownerId: "user-123" });
      mockPrisma.resourceSharing.deleteMany.mockResolvedValue({ count: 1 });

      const { req, res } = mockReqRes(
        { userId: "user-123" },
        { resourceId: "r1", groupId: "g1" },
      );
      await removeResourceFromGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it("returns 500 on database error", async () => {
      mockPrisma.resource.findUnique.mockRejectedValue(new Error("fail"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes(
        { userId: "user-123" },
        { resourceId: "r1", groupId: "g1" },
      );
      await removeResourceFromGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });
});
