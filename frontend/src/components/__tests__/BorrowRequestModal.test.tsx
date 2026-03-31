import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BorrowRequestModal from "../BorrowRequestModal";

const mockPost = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../../utils/apiClient", () => ({
  default: {
    post: (...args: any[]) => mockPost(...args),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("BorrowRequestModal", () => {
  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    resourceId: "r1",
    resourceTitle: "Camping Tent",
    userId: "u1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <MemoryRouter>
        <BorrowRequestModal {...baseProps} isOpen={false} />
      </MemoryRouter>,
    );
    expect(container.childElementCount).toBe(0);
  });

  it("renders modal with resource title", () => {
    render(
      <MemoryRouter>
        <BorrowRequestModal {...baseProps} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Request to Borrow")).toBeInTheDocument();
    expect(screen.getByText("Camping Tent")).toBeInTheDocument();
  });

  it("shows validation errors when submitting empty dates", async () => {
    render(
      <MemoryRouter>
        <BorrowRequestModal {...baseProps} />
      </MemoryRouter>,
    );

    const submitBtn = screen.getByText("Send Request");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/please fill in all required fields/i),
      ).toBeInTheDocument();
    });
  });

  it("submits successfully with valid data", async () => {
    mockPost.mockResolvedValue({ data: { id: "br1" } });
    vi.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <BorrowRequestModal {...baseProps} />
      </MemoryRouter>,
    );

    // Fill in dates - use tomorrow and day after
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const startInput = screen.getByLabelText(/start date/i);
    const endInput = screen.getByLabelText(/end date/i);

    fireEvent.change(startInput, {
      target: { value: tomorrow.toISOString().split("T")[0] },
    });
    fireEvent.change(endInput, {
      target: { value: dayAfter.toISOString().split("T")[0] },
    });

    const submitBtn = screen.getByText("Send Request");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/api/borrow-requests",
        expect.objectContaining({
          resourceId: "r1",
          borrowerId: "u1",
        }),
      );
    });
  });

  it("shows error on API failure", async () => {
    mockPost.mockRejectedValue({
      response: { data: { message: "Resource not available" } },
      message: "Request failed",
    });

    render(
      <MemoryRouter>
        <BorrowRequestModal {...baseProps} />
      </MemoryRouter>,
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: tomorrow.toISOString().split("T")[0] },
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: dayAfter.toISOString().split("T")[0] },
    });

    fireEvent.click(screen.getByText("Send Request"));

    await waitFor(() => {
      expect(screen.getByText("Resource not available")).toBeInTheDocument();
    });
  });

  it("shows duplicate request error", async () => {
    mockPost.mockRejectedValue({
      response: {
        status: 409,
        data: {
          existingRequest: {
            startDate: "2025-06-01",
            endDate: "2025-06-10",
            status: "PENDING",
          },
        },
      },
      message: "Conflict",
    });

    render(
      <MemoryRouter>
        <BorrowRequestModal {...baseProps} />
      </MemoryRouter>,
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: tomorrow.toISOString().split("T")[0] },
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: dayAfter.toISOString().split("T")[0] },
    });

    fireEvent.click(screen.getByText("Send Request"));

    await waitFor(() => {
      expect(
        screen.getByText(/already have a pending request/i),
      ).toBeInTheDocument();
    });
  });
});
