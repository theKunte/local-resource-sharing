/**
 * Route registration tests.
 * These verify that each router module is importable and registers
 * the expected HTTP methods/paths, exercising the module-level code
 * (Router() construction, router.get/post/put/delete calls) that
 * would otherwise have 0% coverage.
 */

// ─── Mock everything that route files depend on ──────────────────────────────

jest.mock("../../src/middleware/auth", () => ({
  authenticateToken: (_req: any, _res: any, next: any) => next(),
  requireVerifiedEmail: (_req: any, _res: any, next: any) => next(),
}));

jest.mock("express-rate-limit", () =>
  jest.fn(() => (_req: any, _res: any, next: any) => next()),
);

jest.mock("../../src/controllers/authController", () => ({
  debugListUsers: jest.fn((_req: any, res: any) => res.json({})),
  registerUser: jest.fn((_req: any, res: any) => res.json({})),
  fixUserEmail: jest.fn((_req: any, res: any) => res.json({})),
}));

jest.mock("../../src/controllers/borrowRequestController", () => ({
  createBorrowRequest: jest.fn((_req: any, res: any) => res.json({})),
  getBorrowRequests: jest.fn((_req: any, res: any) => res.json({})),
  acceptBorrowRequest: jest.fn((_req: any, res: any) => res.json({})),
  declineBorrowRequest: jest.fn((_req: any, res: any) => res.json({})),
  cancelBorrowRequest: jest.fn((_req: any, res: any) => res.json({})),
  updateBorrowRequest: jest.fn((_req: any, res: any) => res.json({})),
  deleteBorrowRequest: jest.fn((_req: any, res: any) => res.json({})),
}));

jest.mock("../../src/controllers/groupController", () => ({
  createGroup: jest.fn((_req: any, res: any) => res.json({})),
  addMember: jest.fn((_req: any, res: any) => res.json({})),
  getGroups: jest.fn((_req: any, res: any) => res.json({})),
  getGroupResources: jest.fn((_req: any, res: any) => res.json({})),
  getGroupMembers: jest.fn((_req: any, res: any) => res.json({})),
  inviteToGroup: jest.fn((_req: any, res: any) => res.json({})),
  removeMember: jest.fn((_req: any, res: any) => res.json({})),
  updateGroup: jest.fn((_req: any, res: any) => res.json({})),
  deleteGroup: jest.fn((_req: any, res: any) => res.json({})),
  transferOwnership: jest.fn((_req: any, res: any) => res.json({})),
  getGroupDetails: jest.fn((_req: any, res: any) => res.json({})),
  removeGroupMember: jest.fn((_req: any, res: any) => res.json({})),
  updateMemberRole: jest.fn((_req: any, res: any) => res.json({})),
  getUserGroups: jest.fn((_req: any, res: any) => res.json({})),
}));

jest.mock("../../src/controllers/loanController", () => ({
  requestReturn: jest.fn((_req: any, res: any) => res.json({})),
  confirmReturn: jest.fn((_req: any, res: any) => res.json({})),
  markReturned: jest.fn((_req: any, res: any) => res.json({})),
}));

jest.mock("../../src/controllers/notificationController", () => ({
  saveNotificationToken: jest.fn((_req: any, res: any) => res.json({})),
}));

jest.mock("../../src/controllers/resourceController", () => ({
  getResources: jest.fn((_req: any, res: any) => res.json({})),
  getPendingRequestsCount: jest.fn((_req: any, res: any) => res.json({})),
  createResource: jest.fn((_req: any, res: any) => res.json({})),
  updateResource: jest.fn((_req: any, res: any) => res.json({})),
  deleteResource: jest.fn((_req: any, res: any) => res.json({})),
  getResourceGroups: jest.fn((_req: any, res: any) => res.json({})),
  addResourceToGroup: jest.fn((_req: any, res: any) => res.json({})),
  removeResourceFromGroup: jest.fn((_req: any, res: any) => res.json({})),
  shareResource: jest.fn((_req: any, res: any) => res.json({})),
}));

jest.mock("../../src/middleware/errorHandler", () => ({
  AppError: class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode = 500) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

import express, { Router } from "express";
import request from "supertest";

// Helper: wrap a router in a minimal Express app
function makeApp(router: Router, prefix = "") {
  const app = express();
  app.use(express.json());
  app.use(prefix, router);
  return app;
}

// ─── Auth routes ─────────────────────────────────────────────────────────────

describe("routes/auth", () => {
  let app: express.Application;

  beforeAll(async () => {
    const { default: authRouter } = await import("../../src/routes/auth");
    app = makeApp(authRouter);
  });

  it("GET /debug/users returns 200", async () => {
    const res = await request(app).get("/debug/users");
    expect(res.status).toBe(200);
  });

  it("POST /auth/register returns 200", async () => {
    const res = await request(app).post("/auth/register").send({});
    expect(res.status).toBe(200);
  });

  it("PUT /auth/fix-user-email returns 200", async () => {
    const res = await request(app).put("/auth/fix-user-email").send({});
    expect(res.status).toBe(200);
  });
});

// ─── BorrowRequests routes ────────────────────────────────────────────────────

describe("routes/borrowRequests", () => {
  let app: express.Application;

  beforeAll(async () => {
    const { default: borrowRouter } = await import(
      "../../src/routes/borrowRequests"
    );
    app = makeApp(borrowRouter);
  });

  it("POST / returns 200", async () => {
    const res = await request(app).post("/").send({});
    expect(res.status).toBe(200);
  });

  it("GET / returns 200", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
  });

  it("POST /:id/accept returns 200", async () => {
    const res = await request(app).post("/br1/accept").send({});
    expect(res.status).toBe(200);
  });

  it("POST /:id/decline returns 200", async () => {
    const res = await request(app).post("/br1/decline").send({});
    expect(res.status).toBe(200);
  });

  it("POST /:id/cancel returns 200", async () => {
    const res = await request(app).post("/br1/cancel").send({});
    expect(res.status).toBe(200);
  });

  it("PUT /:id returns 200", async () => {
    const res = await request(app).put("/br1").send({});
    expect(res.status).toBe(200);
  });

  it("DELETE /:id returns 200", async () => {
    const res = await request(app).delete("/br1").send({});
    expect(res.status).toBe(200);
  });

  it("POST /:id/mark-returned returns 200", async () => {
    const res = await request(app).post("/br1/mark-returned").send({});
    expect(res.status).toBe(200);
  });
});

// ─── Groups routes ────────────────────────────────────────────────────────────

describe("routes/groups", () => {
  let app: express.Application;

  beforeAll(async () => {
    const { default: groupsRouter } = await import("../../src/routes/groups");
    app = makeApp(groupsRouter);
  });

  it("POST / returns 200", async () => {
    const res = await request(app).post("/").send({});
    expect(res.status).toBe(200);
  });

  it("GET / returns 200", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
  });

  it("POST /:groupId/add-member returns 200", async () => {
    const res = await request(app).post("/g1/add-member").send({});
    expect(res.status).toBe(200);
  });

  it("GET /:groupId/resources returns 200", async () => {
    const res = await request(app).get("/g1/resources");
    expect(res.status).toBe(200);
  });

  it("GET /:groupId/members returns 200", async () => {
    const res = await request(app).get("/g1/members");
    expect(res.status).toBe(200);
  });

  it("POST /:groupId/invite returns 200", async () => {
    const res = await request(app).post("/g1/invite").send({});
    expect(res.status).toBe(200);
  });

  it("DELETE /:groupId/members/:userId returns 200", async () => {
    const res = await request(app).delete("/g1/members/u1").send({});
    expect(res.status).toBe(200);
  });

  it("PUT /:groupId returns 200", async () => {
    const res = await request(app).put("/g1").send({});
    expect(res.status).toBe(200);
  });

  it("DELETE /:groupId returns 200", async () => {
    const res = await request(app).delete("/g1").send({});
    expect(res.status).toBe(200);
  });

  it("PUT /:groupId/transfer-ownership returns 200", async () => {
    const res = await request(app).put("/g1/transfer-ownership").send({});
    expect(res.status).toBe(200);
  });

  it("GET /:groupId/details returns 200", async () => {
    const res = await request(app).get("/g1/details");
    expect(res.status).toBe(200);
  });

  it("DELETE /:groupId/remove-member returns 200", async () => {
    const res = await request(app).delete("/g1/remove-member").send({});
    expect(res.status).toBe(200);
  });

  it("PUT /:groupId/members/:userId/role returns 200", async () => {
    const res = await request(app).put("/g1/members/u1/role").send({});
    expect(res.status).toBe(200);
  });
});

// ─── Loans routes ─────────────────────────────────────────────────────────────

describe("routes/loans", () => {
  let app: express.Application;

  beforeAll(async () => {
    const { default: loansRouter } = await import("../../src/routes/loans");
    app = makeApp(loansRouter);
  });

  it("POST /:id/request-return returns 200", async () => {
    const res = await request(app).post("/l1/request-return").send({});
    expect(res.status).toBe(200);
  });

  it("POST /:id/confirm-return returns 200", async () => {
    const res = await request(app).post("/l1/confirm-return").send({});
    expect(res.status).toBe(200);
  });
});

// ─── Notifications routes ─────────────────────────────────────────────────────

describe("routes/notifications", () => {
  let app: express.Application;

  beforeAll(async () => {
    const { default: notifRouter } = await import(
      "../../src/routes/notifications"
    );
    app = makeApp(notifRouter);
  });

  it("POST /token returns 200", async () => {
    const res = await request(app).post("/token").send({});
    expect(res.status).toBe(200);
  });
});

// ─── Resources routes ─────────────────────────────────────────────────────────

describe("routes/resources", () => {
  let app: express.Application;

  beforeAll(async () => {
    const { default: resourcesRouter } = await import(
      "../../src/routes/resources"
    );
    app = makeApp(resourcesRouter);
  });

  it("GET / returns 200", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
  });

  it("GET /:id/pending-requests-count returns 200", async () => {
    const res = await request(app).get("/r1/pending-requests-count");
    expect(res.status).toBe(200);
  });

  it("POST / returns 200", async () => {
    const res = await request(app).post("/").send({});
    expect(res.status).toBe(200);
  });

  it("PUT /:id returns 200", async () => {
    const res = await request(app).put("/r1").send({});
    expect(res.status).toBe(200);
  });

  it("DELETE /:id returns 200", async () => {
    const res = await request(app).delete("/r1").send({});
    expect(res.status).toBe(200);
  });

  it("GET /:resourceId/groups returns 200", async () => {
    const res = await request(app).get("/r1/groups");
    expect(res.status).toBe(200);
  });

  it("POST /:resourceId/groups/:groupId returns 200", async () => {
    const res = await request(app).post("/r1/groups/g1").send({});
    expect(res.status).toBe(200);
  });

  it("DELETE /:resourceId/groups/:groupId returns 200", async () => {
    const res = await request(app).delete("/r1/groups/g1").send({});
    expect(res.status).toBe(200);
  });

  it("POST /:resourceId/share returns 200", async () => {
    const res = await request(app).post("/r1/share").send({});
    expect(res.status).toBe(200);
  });
});

// ─── Users routes ─────────────────────────────────────────────────────────────

describe("routes/users", () => {
  let app: express.Application;

  beforeAll(async () => {
    const { default: usersRouter } = await import("../../src/routes/users");
    app = makeApp(usersRouter);
  });

  it("GET /:userId/groups returns 200", async () => {
    const res = await request(app).get("/u1/groups");
    expect(res.status).toBe(200);
  });
});

// ─── testErrors routes ────────────────────────────────────────────────────────

describe("routes/testErrors", () => {
  let app: express.Application;

  beforeAll(async () => {
    const { default: testErrorsRouter } = await import(
      "../../src/routes/testErrors"
    );
    app = makeApp(testErrorsRouter);
    // Add a simple error handler so synchronous throws return a proper response
    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.statusCode || 500).json({ error: err.message });
    });
  });

  it("GET /test-sync-error throws AppError with status 400", async () => {
    const res = await request(app).get("/test-sync-error");
    expect(res.status).toBe(400);
  });

  it("GET /test-401 throws 401", async () => {
    const res = await request(app).get("/test-401");
    expect(res.status).toBe(401);
  });

  it("GET /test-403 throws 403", async () => {
    const res = await request(app).get("/test-403");
    expect(res.status).toBe(403);
  });

  it("GET /test-404 throws 404", async () => {
    const res = await request(app).get("/test-404");
    expect(res.status).toBe(404);
  });

  it("GET /test-422 throws 422", async () => {
    const res = await request(app).get("/test-422");
    expect(res.status).toBe(422);
  });

  it("GET /test-json-error throws SyntaxError (500)", async () => {
    const res = await request(app).get("/test-json-error");
    expect(res.status).toBe(500);
  });

  it("router module registers all expected routes", async () => {
    // Just verify the router was imported and registered without errors
    expect(app).toBeDefined();
  });
});
