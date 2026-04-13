import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock("../../utils/apiClient", () => ({
  default: {
    get: mockGet,
    post: mockPost,
    delete: mockDelete,
  },
}));

import ManageGroupsModal from "../ManageGroupsModal";

const groups = [
  { id: "g1", name: "Family", memberCount: 3 },
  { id: "g2", name: "Friends", memberCount: 5 },
];

const sharedGroups = [{ id: "g1", name: "Family" }];

describe("ManageGroupsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when not open", () => {
    const { container } = render(
      <ManageGroupsModal
        open={false}
        userId="u1"
        resourceId="r1"
        onClose={vi.fn()}
      />,
    );
    expect(container.childElementCount).toBe(0);
  });

  it("shows loading state while fetching groups", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(
      <ManageGroupsModal
        open={true}
        userId="u1"
        resourceId="r1"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/loading groups/i)).toBeInTheDocument();
  });

  it("renders groups list after loading", async () => {
    mockGet
      .mockResolvedValueOnce({ data: groups })
      .mockResolvedValueOnce({ data: sharedGroups });

    render(
      <ManageGroupsModal
        open={true}
        userId="u1"
        resourceId="r1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Family")).toBeInTheDocument();
      expect(screen.getByText("Friends")).toBeInTheDocument();
    });
  });

  it("shows the Manage Groups heading", async () => {
    mockGet
      .mockResolvedValueOnce({ data: groups })
      .mockResolvedValueOnce({ data: sharedGroups });

    render(
      <ManageGroupsModal
        open={true}
        userId="u1"
        resourceId="r1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Manage Groups")).toBeInTheDocument();
    });
  });

  it("calls onClose when close button is clicked", async () => {
    mockGet
      .mockResolvedValueOnce({ data: groups })
      .mockResolvedValueOnce({ data: sharedGroups });

    const closeFn = vi.fn();
    render(
      <ManageGroupsModal
        open={true}
        userId="u1"
        resourceId="r1"
        onClose={closeFn}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Manage Groups")).toBeInTheDocument();
    });

    // Click the backdrop
    const backdrop = document.querySelector(".bg-black\\/50");
    if (backdrop) fireEvent.click(backdrop);
    expect(closeFn).toHaveBeenCalled();
  });

  it("pre-selects already shared groups", async () => {
    mockGet
      .mockResolvedValueOnce({ data: groups })
      .mockResolvedValueOnce({ data: sharedGroups });

    render(
      <ManageGroupsModal
        open={true}
        userId="u1"
        resourceId="r1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Family")).toBeInTheDocument();
    });

    // Family should be checked (pre-selected)
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const familyCheckbox = Array.from(checkboxes).find(
      (cb) => (cb as HTMLInputElement).checked,
    );
    expect(familyCheckbox).toBeTruthy();
  });

  it("saves group selection changes", async () => {
    mockGet
      .mockResolvedValueOnce({ data: groups })
      .mockResolvedValueOnce({ data: sharedGroups });

    const closeFn = vi.fn();
    const savedFn = vi.fn();
    render(
      <ManageGroupsModal
        open={true}
        userId="u1"
        resourceId="r1"
        onClose={closeFn}
        onSaved={savedFn}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Family")).toBeInTheDocument();
    });

    // Mock the save requests
    mockGet.mockResolvedValueOnce({ data: sharedGroups }); // re-fetch shared
    mockPost.mockResolvedValue({ data: {} });

    fireEvent.click(screen.getByText(/save/i));

    await waitFor(() => {
      expect(closeFn).toHaveBeenCalled();
    });
  });
});
