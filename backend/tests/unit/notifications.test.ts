// Mock firebase-admin
const mockSend = jest.fn() as jest.MockedFunction<any>;
const mockMessaging = jest.fn(() => ({ send: mockSend }));

jest.mock("firebase-admin", () => ({
  __esModule: true,
  default: { messaging: mockMessaging },
}));

// Mock prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn() as jest.MockedFunction<any>,
    update: jest.fn() as jest.MockedFunction<any>,
  },
};
jest.mock("../../src/prisma", () => ({
  __esModule: true,
  default: mockPrisma,
}));

import {
  sendNotification,
  notifyNewBorrowRequest,
  notifyRequestAccepted,
  notifyRequestDeclined,
  notifyReturnRequested,
  notifyReturnConfirmed,
} from "../../src/utils/notifications";

describe("sendNotification", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns early when user has no fcmToken", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ fcmToken: null });

    await sendNotification("user-1", { title: "Test", body: "Hello" });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns early when user is not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await sendNotification("user-1", { title: "Test", body: "Hello" });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends notification with correct payload when user has token", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ fcmToken: "valid-token" });
    mockSend.mockResolvedValue("message-id");

    await sendNotification("user-1", {
      title: "New Request",
      body: "Someone wants to borrow your item",
      data: { type: "borrow_request", requestId: "req-1" },
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "valid-token",
        notification: {
          title: "New Request",
          body: "Someone wants to borrow your item",
        },
        data: { type: "borrow_request", requestId: "req-1" },
      }),
    );
  });

  it("sends notification without optional data field", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ fcmToken: "valid-token" });
    mockSend.mockResolvedValue("message-id");

    await sendNotification("user-1", {
      title: "Hello",
      body: "World",
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "valid-token",
        notification: { title: "Hello", body: "World" },
      }),
    );
  });

  it("removes invalid/expired token from DB on invalid-registration-token error", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ fcmToken: "bad-token" });
    const err = Object.assign(new Error("invalid"), {
      code: "messaging/invalid-registration-token",
    });
    mockSend.mockRejectedValue(err);
    jest.spyOn(console, "error").mockImplementation();

    await sendNotification("user-1", { title: "Test", body: "Test" });

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { fcmToken: null },
    });

    jest.restoreAllMocks();
  });

  it("removes token on registration-token-not-registered error", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ fcmToken: "stale-token" });
    const err = Object.assign(new Error("not registered"), {
      code: "messaging/registration-token-not-registered",
    });
    mockSend.mockRejectedValue(err);
    jest.spyOn(console, "error").mockImplementation();

    await sendNotification("user-1", { title: "Test", body: "Test" });

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { fcmToken: null },
    });

    jest.restoreAllMocks();
  });

  it("logs error but does not throw on generic send failure", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ fcmToken: "token" });
    mockSend.mockRejectedValue(new Error("network error"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    await expect(
      sendNotification("user-1", { title: "Test", body: "Test" }),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it("logs error with string message when error has no message property", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ fcmToken: "token" });
    mockSend.mockRejectedValue("some-string-error");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    await sendNotification("user-1", { title: "Test", body: "Test" });

    expect(consoleSpy).toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});

describe("notification helper functions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("notifyNewBorrowRequest sends to owner with correct payload", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ fcmToken: "owner-token" });
    mockSend.mockResolvedValue("msg-id");

    await notifyNewBorrowRequest("owner-1", "Alice", "Power Drill", "req-1");

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "owner-token",
        notification: expect.objectContaining({
          title: "New Borrow Request",
          body: 'Alice wants to borrow your "Power Drill"',
        }),
        data: { type: "borrow_request", requestId: "req-1" },
      }),
    );
  });

  it("notifyRequestAccepted sends to borrower with correct payload", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      fcmToken: "borrower-token",
    });
    mockSend.mockResolvedValue("msg-id");

    await notifyRequestAccepted("borrower-1", "Bob", "Ladder", "req-2");

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "borrower-token",
        notification: expect.objectContaining({
          title: "Request Accepted!",
          body: 'Bob approved your request for "Ladder"',
        }),
        data: { type: "request_accepted", requestId: "req-2" },
      }),
    );
  });

  it("notifyRequestDeclined sends to borrower with correct payload", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      fcmToken: "borrower-token",
    });
    mockSend.mockResolvedValue("msg-id");

    await notifyRequestDeclined("borrower-1", "Carol", "Tent", "req-3");

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "borrower-token",
        notification: expect.objectContaining({
          title: "Request Declined",
          body: 'Carol declined your request for "Tent"',
        }),
        data: { type: "request_declined", requestId: "req-3" },
      }),
    );
  });

  it("notifyReturnRequested sends to owner with correct payload", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ fcmToken: "owner-token" });
    mockSend.mockResolvedValue("msg-id");

    await notifyReturnRequested("owner-1", "Dave", "Bike", "loan-1");

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "owner-token",
        notification: expect.objectContaining({
          title: "Item Return Requested",
          body: 'Dave says they returned your "Bike" \u2014 please confirm',
        }),
        data: { type: "return_requested", loanId: "loan-1" },
      }),
    );
  });

  it("notifyReturnConfirmed sends to borrower with correct payload", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      fcmToken: "borrower-token",
    });
    mockSend.mockResolvedValue("msg-id");

    await notifyReturnConfirmed("borrower-1", "Eve", "Camera", "loan-2");

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "borrower-token",
        notification: expect.objectContaining({
          title: "Return Confirmed",
          body: 'Eve confirmed the return of "Camera"',
        }),
        data: { type: "return_confirmed", loanId: "loan-2" },
      }),
    );
  });

  it("helper functions silently succeed when user has no token", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ fcmToken: null });

    await expect(
      notifyNewBorrowRequest("owner-no-token", "Alice", "Drill", "req-1"),
    ).resolves.toBeUndefined();

    expect(mockSend).not.toHaveBeenCalled();
  });
});
