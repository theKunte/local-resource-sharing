import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock("../../utils/apiClient", () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}));

import ManageGroupSharing from "../ManageGroupSharing";

const allGroups = [
  { id: "g1", name: "Family", memberCount: 3 },
  { id: "g2", name: "Friends", memberCount: 5 },
];

describe("ManageGroupSharing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  it("returns null when not open", () => {
    const { container } = render(
      <ManageGroupSharing
        isOpen={false}
        onClose={vi.fn()}
        gearId="r1"
        gearTitle="Tent"
        userId="u1"
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows loading state", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(
      <ManageGroupSharing
        isOpen={true}
        onClose={vi.fn()}
        gearId="r1"
        gearTitle="Tent"
        userId="u1"
      />,
    );
    expect(screen.getByText(/loading groups/i)).toBeInTheDocument();
  });

  it("shows gear title in header", async () => {
    mockGet
      .mockResolvedValueOnce({ data: allGroups })
      .mockResolvedValueOnce({ data: [{ id: "g1" }] });

    render(
      <ManageGroupSharing
        isOpen={true}
        onClose={vi.fn()}
        gearId="r1"
        gearTitle="Camping Tent"
        userId="u1"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Camping Tent")).toBeInTheDocument();
    });
  });

  it("renders group list with sharing status", async () => {
    mockGet
      .mockResolvedValueOnce({ data: allGroups })
      .mockResolvedValueOnce({ data: [{ id: "g1" }] });

    render(
      <ManageGroupSharing
        isOpen={true}
        onClose={vi.fn()}
        gearId="r1"
        gearTitle="Tent"
        userId="u1"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Family")).toBeInTheDocument();
      expect(screen.getByText("Friends")).toBeInTheDocument();
    });

    // Family is already shared
    expect(screen.getByText("Shared")).toBeInTheDocument();
  });

  it("shows empty state when no groups", async () => {
    mockGet
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] });

    render(
      <ManageGroupSharing
        isOpen={true}
        onClose={vi.fn()}
        gearId="r1"
        gearTitle="Tent"
        userId="u1"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/you don't belong to any groups/i),
      ).toBeInTheDocument();
    });
  });

  it("calls addToGroup on Add click", async () => {
    mockGet
      .mockResolvedValueOnce({ data: allGroups })
      .mockResolvedValueOnce({ data: [] }); // nothing shared yet

    mockPost.mockResolvedValue({ data: {} });
    // Also mock the reload calls after add
    mockGet
      .mockResolvedValueOnce({ data: allGroups })
      .mockResolvedValueOnce({ data: [{ id: "g1" }] });

    render(
      <ManageGroupSharing
        isOpen={true}
        onClose={vi.fn()}
        gearId="r1"
        gearTitle="Tent"
        userId="u1"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Family")).toBeInTheDocument();
    });

    // Click Add for Family
    const addButtons = screen.getAllByText("Add");
    fireEvent.click(addButtons[0]);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/api/resources/r1/groups/g1", {
        userId: "u1",
      });
    });
  });

  it("calls onClose when Done button clicked", async () => {
    mockGet
      .mockResolvedValueOnce({ data: allGroups })
      .mockResolvedValueOnce({ data: [] });

    const closeFn = vi.fn();
    render(
      <ManageGroupSharing
        isOpen={true}
        onClose={closeFn}
        gearId="r1"
        gearTitle="Tent"
        userId="u1"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Manage Group Sharing")).toBeInTheDocument();
    });

    // Click Done button in footer
    fireEvent.click(screen.getByText("Done"));
    expect(closeFn).toHaveBeenCalled();
  });
});
