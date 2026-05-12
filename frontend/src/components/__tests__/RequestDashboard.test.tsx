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

  it("calls cancel API when Cancel is clicked", async () => {
    mockGet
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [basePendingOwner] } })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } });
    mockPost.mockResolvedValue({ data: {} });

    render(<RequestDashboard userId="borrower1" />);

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/api/borrow-requests/req1/cancel",
        { userId: "borrower1" },
      );
    });
  });

  it("handles cancel API error", async () => {
    const alertSpy = vi.spyOn(window, "alert");
    mockGet
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [basePendingOwner] } })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } });
    mockPost.mockRejectedValue(new Error("Cancel failed"));

    render(<RequestDashboard userId="borrower1" />);

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Failed to cancel request");
    });
  });

  it("does not cancel when user cancels confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    mockGet
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [basePendingOwner] } });

    render(<RequestDashboard userId="borrower1" />);

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Cancel"));

    expect(mockPut).not.toHaveBeenCalled();
  });

  it("opens edit modal when Edit is clicked", async () => {
    mockGet
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [basePendingOwner] } });

    render(<RequestDashboard userId="borrower1" />);

    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Edit"));

    await waitFor(() => {
      expect(screen.getByText("Edit Request")).toBeInTheDocument();
    });
  });

  it("updates request when Save Changes is clicked in edit modal", async () => {
    mockGet
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [basePendingOwner] } })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } });
    mockPut.mockResolvedValue({ data: {} });

    render(<RequestDashboard userId="borrower1" />);

    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Edit"));

    await waitFor(() => {
      expect(screen.getByText("Edit Request")).toBeInTheDocument();
    });

    // Change the message
    const messageInput = screen.getByPlaceholderText(/add a note/i);
    fireEvent.change(messageInput, { target: { value: "Updated message" } });

    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        "/api/borrow-requests/req1",
        expect.objectContaining({
          message: "Updated message",
        }),
      );
    });
  });

  it("handles update request error", async () => {
    const alertSpy = vi.spyOn(window, "alert");
    mockGet
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [basePendingOwner] } })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } });
    mockPut.mockRejectedValue(new Error("Update failed"));

    render(<RequestDashboard userId="borrower1" />);

    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Edit"));

    await waitFor(() => {
      expect(screen.getByText("Edit Request")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Failed to update request");
    });
  });

  it("closes edit modal when Cancel button is clicked", async () => {
    mockGet
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [basePendingOwner] } });

    render(<RequestDashboard userId="borrower1" />);

    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Edit"));

    await waitFor(() => {
      expect(screen.getByText("Edit Request")).toBeInTheDocument();
    });

    // Click the Cancel button in the modal (not the one on the card)
    const cancelButtons = screen.getAllByText("Cancel");
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);

    await waitFor(() => {
      expect(screen.queryByText("Edit Request")).not.toBeInTheDocument();
    });
  });

  it("calls delete API when Delete is clicked", async () => {
    const rejectedRequest = {
      ...basePendingOwner,
      id: "req5",
      status: "REJECTED",
    };
    mockGet
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [rejectedRequest] } })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } });
    mockDelete.mockResolvedValue({ data: {} });

    render(<RequestDashboard userId="borrower1" />);

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("/api/borrow-requests/req5", {
        data: { userId: "borrower1" },
      });
    });
  });

  it("handles delete API error", async () => {
    const alertSpy = vi.spyOn(window, "alert");
    const rejectedRequest = {
      ...basePendingOwner,
      id: "req5",
      status: "REJECTED",
    };
    mockGet
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [rejectedRequest] } })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } });
    mockDelete.mockRejectedValue(new Error("Delete failed"));

    render(<RequestDashboard userId="borrower1" />);

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Failed to delete request");
    });
  });

  it("calls mark returned API when Mark as Returned is clicked", async () => {
    mockGet
      .mockResolvedValueOnce({ data: { requests: [activeRequest] } })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } });
    mockPost.mockResolvedValue({ data: {} });

    render(<RequestDashboard userId="owner1" />);

    await waitFor(() => {
      expect(screen.getByText("Mark as Returned")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Mark as Returned"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/api/borrow-requests/req2/mark-returned",
        { userId: "owner1" },
      );
    });
  });

  it("handles mark returned API error", async () => {
    const alertSpy = vi.spyOn(window, "alert");
    mockGet
      .mockResolvedValueOnce({ data: { requests: [activeRequest] } })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } });
    mockPost.mockRejectedValue(new Error("Mark returned failed"));

    render(<RequestDashboard userId="owner1" />);

    await waitFor(() => {
      expect(screen.getByText("Mark as Returned")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Mark as Returned"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Failed to mark as returned");
    });
  });

  it("calls initiate return API when I Returned This is clicked", async () => {
    mockGet
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [activeRequest] } })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } });
    mockPost.mockResolvedValue({ data: {} });

    render(<RequestDashboard userId="borrower1" />);

    await waitFor(() => {
      expect(screen.getByText("I Returned This")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("I Returned This"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/api/loans/loan1/request-return", {
        userId: "borrower1",
      });
    });
  });

  it("handles initiate return API error", async () => {
    const alertSpy = vi.spyOn(window, "alert");
    mockGet
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [activeRequest] } })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } });
    mockPost.mockRejectedValue(new Error("Initiate return failed"));

    render(<RequestDashboard userId="borrower1" />);

    await waitFor(() => {
      expect(screen.getByText("I Returned This")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("I Returned This"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Failed to initiate return");
    });
  });

  it("calls confirm return API when Confirm Return is clicked", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { requests: [pendingReturnRequest] },
      })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } });
    mockPost.mockResolvedValue({ data: {} });

    render(<RequestDashboard userId="owner1" />);

    await waitFor(() => {
      expect(screen.getByText("Confirm Return")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Confirm Return"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/api/loans/loan3/confirm-return", {
        userId: "owner1",
      });
    });
  });

  it("handles confirm return API error", async () => {
    const alertSpy = vi.spyOn(window, "alert");
    mockGet
      .mockResolvedValueOnce({
        data: { requests: [pendingReturnRequest] },
      })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } });
    mockPost.mockRejectedValue(new Error("Confirm return failed"));

    render(<RequestDashboard userId="owner1" />);

    await waitFor(() => {
      expect(screen.getByText("Confirm Return")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Confirm Return"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Failed to confirm return");
    });
  });

  it("filters requests when filter tabs are clicked", async () => {
    mockGet
      .mockResolvedValueOnce({ data: { requests: [basePendingOwner] } })
      .mockResolvedValueOnce({ data: { requests: [activeRequest] } });

    render(<RequestDashboard userId="owner1" />);

    await waitFor(() => {
      expect(screen.getAllByText("Camping Tent").length).toBeGreaterThan(0);
    });

    // Click on Borrowed tab
    const borrowedTab = screen.getByText(/Borrowed \(/);
    fireEvent.click(borrowedTab);

    await waitFor(() => {
      expect(screen.queryByText("Accept")).not.toBeInTheDocument();
    });
  });

  it("shows Overdue badge for overdue active loans", async () => {
    const overdueEnd = new Date();
    overdueEnd.setDate(overdueEnd.getDate() - 2); // 2 days ago
    const overdueStart = new Date();
    overdueStart.setMonth(overdueStart.getMonth() - 1);
    const overdueRequest = {
      ...activeRequest,
      startDate: overdueStart.toISOString(),
      endDate: overdueEnd.toISOString(),
      loan: {
        ...activeRequest.loan,
        startDate: overdueStart.toISOString(),
        endDate: overdueEnd.toISOString(),
      },
    };
    mockGet
      .mockResolvedValueOnce({ data: { requests: [overdueRequest] } })
      .mockResolvedValueOnce({ data: { requests: [] } });

    render(<RequestDashboard userId="owner1" />);

    await waitFor(() => {
      expect(screen.getAllByText(/Overdue/i).length).toBeGreaterThan(0);
    });
  });

  it("handles accept API error", async () => {
    const alertSpy = vi.spyOn(window, "alert");
    mockGet
      .mockResolvedValueOnce({ data: { requests: [basePendingOwner] } })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } });
    mockPost.mockRejectedValue(new Error("Accept failed"));

    render(<RequestDashboard userId="owner1" />);

    await waitFor(() => {
      expect(screen.getByText("Accept")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Accept"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Failed to accept request");
    });
  });

  it("handles decline API error", async () => {
    const alertSpy = vi.spyOn(window, "alert");
    mockGet
      .mockResolvedValueOnce({ data: { requests: [basePendingOwner] } })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [] } });
    mockPost.mockRejectedValue(new Error("Decline failed"));

    render(<RequestDashboard userId="owner1" />);

    await waitFor(() => {
      expect(screen.getByText("Decline")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Decline"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Failed to decline request");
    });
  });
});
