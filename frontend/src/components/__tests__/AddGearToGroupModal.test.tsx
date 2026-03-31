import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("../../utils/apiClient", () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
  },
}));

import AddGearToGroupModal from "../AddGearToGroupModal";

describe("AddGearToGroupModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when not open", () => {
    const { container } = render(
      <AddGearToGroupModal
        open={false}
        groupId="g1"
        userId="u1"
        onClose={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows loading when open", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(
      <AddGearToGroupModal
        open={true}
        groupId="g1"
        userId="u1"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows heading", async () => {
    mockGet
      .mockResolvedValueOnce({ data: [] }) // my gear
      .mockResolvedValueOnce({ data: [] }); // shared resources

    render(
      <AddGearToGroupModal
        open={true}
        groupId="g1"
        userId="u1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Add Gear to Group")).toBeInTheDocument();
    });
  });

  it("renders gear candidates (not already shared)", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: [
          { id: "r1", title: "Tent", description: "A tent" },
          { id: "r2", title: "Stove", description: "Camp stove" },
        ],
      })
      .mockResolvedValueOnce({
        data: [{ id: "r1" }], // r1 already shared
      });

    render(
      <AddGearToGroupModal
        open={true}
        groupId="g1"
        userId="u1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      // Only r2 should be shown (r1 is already shared)
      expect(screen.queryByText("Tent")).not.toBeInTheDocument();
      expect(screen.getByText("Stove")).toBeInTheDocument();
    });
  });

  it("shows empty state when all gear is shared", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: [{ id: "r1", title: "Tent", description: "A tent" }],
      })
      .mockResolvedValueOnce({
        data: [{ id: "r1" }],
      });

    render(
      <AddGearToGroupModal
        open={true}
        groupId="g1"
        userId="u1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("No available gear to add.")).toBeInTheDocument();
    });
  });

  it("calls API and onSaved when clicking Add", async () => {
    const onSaved = vi.fn();
    mockGet
      .mockResolvedValueOnce({
        data: [{ id: "r1", title: "Tent", description: "A tent" }],
      })
      .mockResolvedValueOnce({ data: [] });

    mockPost.mockResolvedValue({ status: 200 });

    render(
      <AddGearToGroupModal
        open={true}
        groupId="g1"
        userId="u1"
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Tent")).toBeInTheDocument();
    });

    const addButton = screen.getByText("Add");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/api/resources/r1/groups/g1"),
        { userId: "u1" },
      );
    });
  });

  it("calls onClose when Close button clicked", async () => {
    mockGet
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] });

    const onClose = vi.fn();
    render(
      <AddGearToGroupModal
        open={true}
        groupId="g1"
        userId="u1"
        onClose={onClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Add Gear to Group")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalled();
  });
});
