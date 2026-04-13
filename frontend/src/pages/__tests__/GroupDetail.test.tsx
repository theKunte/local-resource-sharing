import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const { mockGet, mockPost, mockPut, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("../../hooks/useFirebaseAuth", () => ({
  useFirebaseAuth: vi.fn(),
}));

vi.mock("../../utils/apiClient", () => ({
  default: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
  },
}));

vi.mock("../../components/ManageGroupsModal", () => ({
  default: () => <div data-testid="manage-groups-modal" />,
}));

vi.mock("../../components/AddGearToGroupModal", () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="add-gear-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("../../components/BorrowRequestModal", () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="borrow-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

import GroupDetail from "../GroupDetail";
import { useFirebaseAuth } from "../../hooks/useFirebaseAuth";

const mockAuth = useFirebaseAuth as ReturnType<typeof vi.fn>;

const renderWithRoute = (groupId = "g1") =>
  render(
    <MemoryRouter initialEntries={[`/groups/${groupId}`]}>
      <Routes>
        <Route path="/groups/:groupId" element={<GroupDetail />} />
        <Route path="/" element={<div>Home</div>} />
        <Route path="/groups" element={<div>Groups List</div>} />
      </Routes>
    </MemoryRouter>,
  );

const mockGroup = {
  id: "g1",
  name: "Hiking Crew",
  description: "Weekend hikers",
  avatar: null,
  createdById: "u1",
  memberCount: 2,
  sharedResourcesCount: 1,
  members: [
    {
      id: "m1",
      userId: "u1",
      role: "owner",
      user: { id: "u1", email: "owner@test.com", name: "Owner" },
    },
    {
      id: "m2",
      userId: "u2",
      role: "member",
      user: { id: "u2", email: "member@test.com", name: "Member" },
    },
  ],
  resources: [
    {
      id: "gr1",
      resource: {
        id: "r1",
        title: "Tent",
        description: "2-person tent",
        image: "data:image/png;base64,abc",
        ownerId: "u1",
        owner: { id: "u1", email: "owner@test.com", name: "Owner" },
      },
    },
  ],
  userPermissions: {
    canEdit: true,
    canDelete: true,
    canInvite: true,
    canRemoveMembers: true,
    canTransferOwnership: true,
  },
};

describe("GroupDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "prompt").mockReturnValue("Updated Title");
  });

  it("shows loading spinner while fetching", () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1" },
      loading: false,
    });
    mockGet.mockReturnValue(new Promise(() => {})); // never resolves

    renderWithRoute();
    expect(screen.getByText("Loading group details...")).toBeInTheDocument();
  });

  it("shows loading during auth check", () => {
    mockAuth.mockReturnValue({ user: null, loading: true });
    renderWithRoute();
    expect(screen.getByText("Loading group details...")).toBeInTheDocument();
  });

  it("redirects when not logged in", () => {
    mockAuth.mockReturnValue({ user: null, loading: false });
    renderWithRoute();
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("renders group details after loading", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1" },
      loading: false,
    });
    mockGet.mockResolvedValueOnce({ data: mockGroup });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Hiking Crew")).toBeInTheDocument();
    });

    expect(screen.getByText("Weekend hikers")).toBeInTheDocument();
    expect(screen.getByText("owner")).toBeInTheDocument();
  });

  it("shows stats cards", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: mockGroup });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Total Items")).toBeInTheDocument();
      expect(screen.getByText("Members")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument(); // sharedResourcesCount
      expect(screen.getByText("2")).toBeInTheDocument(); // memberCount
    });
  });

  it("shows items tab by default with gear cards", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: mockGroup });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Tent")).toBeInTheDocument();
    });

    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText(/Owned by Owner/)).toBeInTheDocument();
  });

  it("shows edit/remove buttons for own gear", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: mockGroup });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeInTheDocument();
      expect(screen.getByText("Remove from group")).toBeInTheDocument();
    });
  });

  it("shows borrow button for others gear", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u2" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: mockGroup });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Request to Borrow")).toBeInTheDocument();
    });
  });

  it("switches to members tab", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: mockGroup });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Hiking Crew")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Members" }));

    await waitFor(() => {
      expect(screen.getByText("Owner")).toBeInTheDocument();
      expect(screen.getByText("Member")).toBeInTheDocument();
    });
  });

  it("switches to activity tab", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: mockGroup });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Hiking Crew")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Activity" }));

    await waitFor(() => {
      expect(
        screen.getByText("Activity feed coming soon."),
      ).toBeInTheDocument();
    });
  });

  it("shows invite button on members tab", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: mockGroup });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Hiking Crew")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Members" }));

    await waitFor(() => {
      expect(screen.getByText("Invite New Member")).toBeInTheDocument();
    });
  });

  it("opens and submits invite form", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: mockGroup });
    mockPost.mockResolvedValueOnce({ data: { success: true } });
    // After invite, fetchGroupDetails is called again
    mockGet.mockResolvedValueOnce({ data: mockGroup });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Hiking Crew")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Members" }));

    await waitFor(() => {
      expect(screen.getByText("Invite New Member")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Invite New Member"));

    const emailInput = screen.getByPlaceholderText("Enter email address");
    fireEvent.change(emailInput, { target: { value: "new@test.com" } });
    fireEvent.click(screen.getByText("Send"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/api/groups/g1/invite", {
        email: "new@test.com",
        invitedBy: "u1",
      });
    });
  });

  it("handles invite error", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: mockGroup });
    mockPost.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "User not found" } },
    });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Hiking Crew")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Members" }));
    await waitFor(() => {
      expect(screen.getByText("Invite New Member")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Invite New Member"));
    const emailInput = screen.getByPlaceholderText("Enter email address");
    fireEvent.change(emailInput, { target: { value: "bad@test.com" } });
    fireEvent.click(screen.getByText("Send"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });
  });

  it("shows error state for 403", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    const err = new Error("Forbidden") as Error & {
      isAxiosError?: boolean;
      response?: { status: number };
    };
    err.isAxiosError = true;
    err.response = { status: 403 };

    // Mock axios.isAxiosError
    const axios = await import("axios");
    vi.spyOn(axios.default, "isAxiosError").mockReturnValue(true);

    mockGet.mockRejectedValueOnce(err);

    renderWithRoute();

    await waitFor(() => {
      expect(
        screen.getByText("You don't have permission to view this group"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Back to Groups")).toBeInTheDocument();
  });

  it("shows error state for 404", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    const err = new Error("Not found") as Error & {
      isAxiosError?: boolean;
      response?: { status: number };
    };
    err.isAxiosError = true;
    err.response = { status: 404 };

    const axios = await import("axios");
    vi.spyOn(axios.default, "isAxiosError").mockReturnValue(true);

    mockGet.mockRejectedValueOnce(err);

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Group not found")).toBeInTheDocument();
    });
  });

  it("shows search bar in items tab", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: mockGroup });

    renderWithRoute();

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Search items in this group..."),
      ).toBeInTheDocument();
    });
  });

  it("filters items by search query", async () => {
    const groupWith2Items = {
      ...mockGroup,
      resources: [
        ...mockGroup.resources,
        {
          id: "gr2",
          resource: {
            id: "r2",
            title: "Backpack",
            description: "65L hiking pack",
            image: null,
            ownerId: "u2",
            owner: { id: "u2", email: "member@test.com", name: "Member" },
          },
        },
      ],
    };
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: groupWith2Items });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Tent")).toBeInTheDocument();
      expect(screen.getByText("Backpack")).toBeInTheDocument();
    });

    fireEvent.change(
      screen.getByPlaceholderText("Search items in this group..."),
      { target: { value: "Tent" } },
    );

    expect(screen.getByText("Tent")).toBeInTheDocument();
    expect(screen.queryByText("Backpack")).not.toBeInTheDocument();
  });

  it("shows empty state when no items", async () => {
    const emptyGroup = { ...mockGroup, resources: [] };
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: emptyGroup });

    renderWithRoute();

    await waitFor(() => {
      expect(
        screen.getByText("No items shared in this group yet."),
      ).toBeInTheDocument();
    });
  });

  it("shows no search results message", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: mockGroup });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Tent")).toBeInTheDocument();
    });

    fireEvent.change(
      screen.getByPlaceholderText("Search items in this group..."),
      { target: { value: "zzzzz" } },
    );

    expect(screen.getByText("No items match your search.")).toBeInTheDocument();
  });

  it("handles remove member", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet
      .mockResolvedValueOnce({ data: mockGroup })
      .mockResolvedValueOnce({ data: mockGroup }); // after delete refetch
    mockDelete.mockResolvedValueOnce({});

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Hiking Crew")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Members" }));

    await waitFor(() => {
      expect(screen.getByTitle("Remove member")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Remove member"));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(
        "/api/groups/g1/remove-member",
        expect.objectContaining({
          data: { userId: "u1", targetUserId: "u2" },
        }),
      );
    });
  });

  it("handles remove resource from group", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet
      .mockResolvedValueOnce({ data: mockGroup })
      .mockResolvedValueOnce({ data: mockGroup });
    mockDelete.mockResolvedValueOnce({ data: {} });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Remove from group")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Remove from group"));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(
        "/api/resources/r1/groups/g1",
        expect.objectContaining({ data: { userId: "u1" } }),
      );
    });
  });

  it("handles edit resource via prompt", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet
      .mockResolvedValueOnce({ data: mockGroup })
      .mockResolvedValueOnce({ data: mockGroup });
    mockPut.mockResolvedValueOnce({
      data: { id: "r1", title: "Updated Title" },
    });

    // prompt returns the new title and description
    vi.spyOn(window, "prompt")
      .mockReturnValueOnce("Updated Title")
      .mockReturnValueOnce("Updated Description");

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Edit"));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith("/api/resources/r1", {
        title: "Updated Title",
        description: "Updated Description",
      });
    });
  });

  it("shows delete group button for owner", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: mockGroup });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Hiking Crew")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Members" }));

    await waitFor(() => {
      expect(screen.getByText("Delete Group")).toBeInTheDocument();
    });
  });

  it("handles delete group", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: mockGroup });
    mockDelete.mockResolvedValueOnce({});

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Hiking Crew")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Members" }));

    await waitFor(() => {
      expect(screen.getByText("Delete Group")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete Group"));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("/api/groups/g1", {
        data: { userId: "u1" },
      });
    });
  });

  it("shows role update dropdown for owner managing members", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: mockGroup });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Hiking Crew")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Members" }));

    await waitFor(() => {
      const select = screen.getByDisplayValue("member");
      expect(select).toBeInTheDocument();
    });
  });

  it("updates member role", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet
      .mockResolvedValueOnce({ data: mockGroup })
      .mockResolvedValueOnce({ data: mockGroup });
    mockPut.mockResolvedValueOnce({ data: { success: true } });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Hiking Crew")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Members" }));

    await waitFor(() => {
      const select = screen.getByDisplayValue("member");
      fireEvent.change(select, { target: { value: "admin" } });
    });

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        "/api/groups/g1/members/u2/role",
        expect.objectContaining({ requesterId: "u1", role: "admin" }),
      );
    });
  });

  it("opens borrow modal for other users gear", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u2" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: mockGroup });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Request to Borrow")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Request to Borrow"));

    expect(screen.getByTestId("borrow-modal")).toBeInTheDocument();
  });

  it("shows Add Gear and Share New buttons", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: mockGroup });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Add Gear")).toBeInTheDocument();
      expect(screen.getByText("Share New")).toBeInTheDocument();
    });
  });

  it("cancel invite form", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: mockGroup });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Hiking Crew")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Members" }));

    await waitFor(() => {
      expect(screen.getByText("Invite New Member")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Invite New Member"));
    expect(
      screen.getByPlaceholderText("Enter email address"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText("Enter email address"),
      ).not.toBeInTheDocument();
    });
  });
});
