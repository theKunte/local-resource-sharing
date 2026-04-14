import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const { mockGet, mockPost, mockPut, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("../../utils/apiClient", () => ({
  default: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
  },
}));

import RequestDashboard from "../RequestDashboard";

const basePendingOwner = {
  id: "req1",
  resourceId: "r1",
  borrowerId: "borrower1",
  ownerId: "owner1",
  status: "PENDING",
  startDate: "2026-01-01T00:00:00Z",
  endDate: "2026-02-01T00:00:00Z",
  createdAt: "2025-12-15T00:00:00Z",
  resource: {
    id: "r1",
    title: "Camping Tent",
    description: "4-person tent",
    image: "data:image/png;base64,abc",
    status: "AVAILABLE",
  },
  borrower: { id: "borrower1", name: "Alice", email: "alice@test.com" },
  owner: { id: "owner1", name: "Bob", email: "bob@test.com" },
};

const activeRequest = {
  ...basePendingOwner,
  id: "req2",
  status: "APPROVED",
  loan: {
    id: "loan1",
    status: "ACTIVE",
    startDate: "2026-01-01T00:00:00Z",
    endDate: "2026-02-01T00:00:00Z",
  },
};

const returnedRequest = {
  ...basePendingOwner,
  id: "req3",
  status: "APPROVED",
  loan: {
    id: "loan2",
    status: "RETURNED",
    startDate: "2026-01-01T00:00:00Z",
    endDate: "2026-02-01T00:00:00Z",
    returnedDate: "2026-01-20T00:00:00Z",
  },
};

const pendingReturnRequest = {
  ...basePendingOwner,
  id: "req4",
  status: "APPROVED",
  loan: {
    id: "loan3",
    status: "PENDING_RETURN_CONFIRMATION",
    startDate: "2026-01-01T00:00:00Z",
    endDate: "2026-02-01T00:00:00Z",
  },
};

describe("RequestDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  it("shows loading state while fetching requests", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<RequestDashboard userId="owner1" />);
    expect(screen.getByText(/loading requests/i)).toBeInTheDocument();
  });

  it("shows error state on API failure", async () => {
    mockGet.mockRejectedValue(new Error("Network error"));
    render(<RequestDashboard userId="owner1" />);
    await waitFor(() => {
      expect(screen.getByText(/failed to load requests/i)).toBeInTheDocument();
    });
  });

  it("shows empty state when no requests exist", async () => {
    mockGet.mockResolvedValue({ data: { requests: [] } });
    render(<RequestDashboard userId="owner1" />);
    await waitFor(() => {
      expect(screen.getByText(/no requests/i)).toBeInTheDocument();
    });
  });

  it("renders pending request cards with Accept/Decline for owner", async () => {
    mockGet
      .mockResolvedValueOnce({ data: { requests: [basePendingOwner] } }) // incoming (owner)
      .mockResolvedValueOnce({ data: { requests: [] } }); // outgoing

    render(<RequestDashboard userId="owner1" />);

    await waitFor(() => {
      expect(screen.getByText("Camping Tent")).toBeInTheDocument();
    });
    expect(screen.getByText("Accept")).toBeInTheDocument();
    expect(screen.getByText("Decline")).toBeInTheDocument();
  });

  it("renders pending request with Edit/Cancel for borrower", async () => {
    mockGet
      .mockResolvedValueOnce({ data: { requests: [] } }) // incoming
      .mockResolvedValueOnce({
        data: { requests: [basePendingOwner] },
      }); // outgoing (borrower)

    render(<RequestDashboard userId="borrower1" />);

    await waitFor(() => {
      expect(screen.getByText("Camping Tent")).toBeInTheDocument();
    });
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls accept API when Accept is clicked", async () => {
    mockGet
      .mockResolvedValueOnce({ data: { requests: [basePendingOwner] } })
      .mockResolvedValueOnce({ data: { requests: [] } });
    mockPost.mockResolvedValue({ data: { borrowRequest: basePendingOwner } });

    render(<RequestDashboard userId="owner1" />);

    await waitFor(() => {
      expect(screen.getByText("Accept")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Accept"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/api/borrow-requests/req1/accept",
        { userId: "owner1" },
      );
    });
  });

  it("calls decline API when Decline is clicked", async () => {
    mockGet
      .mockResolvedValueOnce({ data: { requests: [basePendingOwner] } })
      .mockResolvedValueOnce({ data: { requests: [] } });
    mockPost.mockResolvedValue({ data: {} });

    render(<RequestDashboard userId="owner1" />);

    await waitFor(() => {
      expect(screen.getByText("Decline")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Decline"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/api/borrow-requests/req1/decline",
        { userId: "owner1" },
      );
    });
  });

  it("shows Mark as Returned for active loan when owner", async () => {
    mockGet
      .mockResolvedValueOnce({ data: { requests: [activeRequest] } })
      .mockResolvedValueOnce({ data: { requests: [] } });

    render(<RequestDashboard userId="owner1" />);

    await waitFor(() => {
      expect(screen.getByText("Mark as Returned")).toBeInTheDocument();
    });
  });

  it("shows I Returned This for active loan when borrower", async () => {
    mockGet
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [activeRequest] } });

    render(<RequestDashboard userId="borrower1" />);

    await waitFor(() => {
      expect(screen.getByText("I Returned This")).toBeInTheDocument();
    });
  });

  it("shows Confirm Return for pending return when owner", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { requests: [pendingReturnRequest] },
      })
      .mockResolvedValueOnce({ data: { requests: [] } });

    render(<RequestDashboard userId="owner1" />);

    await waitFor(() => {
      expect(screen.getByText("Confirm Return")).toBeInTheDocument();
    });
  });

  it("shows status filter tabs", async () => {
    mockGet.mockResolvedValue({ data: { requests: [] } });
    render(<RequestDashboard userId="owner1" />);

    await waitFor(() => {
      expect(screen.getByText(/All \(/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Pending \(/)).toBeInTheDocument();
  });

  it("shows Delete button for rejected/cancelled requests as borrower", async () => {
    const rejectedRequest = {
      ...basePendingOwner,
      id: "req5",
      status: "REJECTED",
    };
    mockGet
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [rejectedRequest] } });

    render(<RequestDashboard userId="borrower1" />);

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });
  });

  it("shows Borrowed status for active loan", async () => {
    // Use dates far in the future to avoid Overdue badge
    const futureEnd = new Date();
    futureEnd.setFullYear(futureEnd.getFullYear() + 2);
    const futureStart = new Date();
    futureStart.setMonth(futureStart.getMonth() - 1);
    const borrowedRequest = {
      ...activeRequest,
      startDate: futureStart.toISOString(),
      endDate: futureEnd.toISOString(),
      loan: {
        ...activeRequest.loan,
        startDate: futureStart.toISOString(),
        endDate: futureEnd.toISOString(),
      },
    };
    mockGet
      .mockResolvedValueOnce({ data: { requests: [borrowedRequest] } })
      .mockResolvedValueOnce({ data: { requests: [] } });

    render(<RequestDashboard userId="owner1" />);

    await waitFor(() => {
      expect(screen.getByText("Camping Tent")).toBeInTheDocument();
    });
    // The badge shows "Borrowed" for APPROVED + ACTIVE loan with future endDate
    await waitFor(() => {
      expect(screen.getByText("Borrowed")).toBeInTheDocument();
    });
  });

  it("shows Returned status badge for returned loan", async () => {
    mockGet
      .mockResolvedValueOnce({ data: { requests: [returnedRequest] } })
      .mockResolvedValueOnce({ data: { requests: [] } });

    render(<RequestDashboard userId="owner1" />);

    await waitFor(() => {
      expect(screen.getByText("Returned")).toBeInTheDocument();
    });
  });

  it("shows Pending Return badge for pending return confirmation", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { requests: [pendingReturnRequest] },
      })
      .mockResolvedValueOnce({ data: { requests: [] } });

    render(<RequestDashboard userId="owner1" />);

    await waitFor(() => {
      expect(screen.getByText("Pending Return")).toBeInTheDocument();
    });
  });
});
