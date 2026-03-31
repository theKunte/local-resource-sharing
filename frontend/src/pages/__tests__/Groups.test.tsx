import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock("../../hooks/useFirebaseAuth", () => ({
  useFirebaseAuth: vi.fn(),
}));

vi.mock("../../utils/apiClient", () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}));

import Groups from "../Groups";
import { useFirebaseAuth } from "../../hooks/useFirebaseAuth";

const mockAuth = useFirebaseAuth as ReturnType<typeof vi.fn>;

describe("Groups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state", () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockReturnValue(new Promise(() => {})); // never resolves

    render(
      <MemoryRouter>
        <Groups />
      </MemoryRouter>,
    );

    // Should be in loading state
    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });

  it("renders groups from API", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet
      .mockResolvedValueOnce({
        data: [
          { id: "g1", name: "Family", createdById: "u1" },
          { id: "g2", name: "Friends", createdById: "u2" },
        ],
      })
      // members calls
      .mockResolvedValueOnce({
        data: [
          { id: "m1", user: { id: "u1", email: "a@test.com", name: "Alice" } },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          { id: "m2", user: { id: "u2", email: "b@test.com", name: "Bob" } },
          { id: "m3", user: { id: "u3", email: "c@test.com", name: "Carol" } },
        ],
      });

    render(
      <MemoryRouter>
        <Groups />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Family")).toBeInTheDocument();
      expect(screen.getByText("Friends")).toBeInTheDocument();
    });
  });

  it("shows empty state when no groups", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: [] });

    render(
      <MemoryRouter>
        <Groups />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/create your first group/i)).toBeInTheDocument();
    });
  });

  it("shows Create New Group button", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: [] });

    render(
      <MemoryRouter>
        <Groups />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Create New Group")).toBeInTheDocument();
    });
  });

  it("opens create group form", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet.mockResolvedValueOnce({ data: [] });

    render(
      <MemoryRouter>
        <Groups />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Create New Group")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Create New Group"));

    await waitFor(() => {
      expect(screen.getByText("Create a New Group")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(
          "e.g., Seattle Hiking Friends, College Roommates",
        ),
      ).toBeInTheDocument();
    });
  });

  it("creates a new group", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    vi.spyOn(window, "alert").mockImplementation(() => {});
    mockGet.mockResolvedValueOnce({ data: [] }); // initial load
    mockPost.mockResolvedValueOnce({ data: { id: "g3", name: "New Group" } });
    mockGet.mockResolvedValueOnce({ data: [] }); // reload after create

    render(
      <MemoryRouter>
        <Groups />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Create New Group")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Create New Group"));

    await waitFor(() => {
      const input = screen.getByPlaceholderText(
        "e.g., Seattle Hiking Friends, College Roommates",
      );
      fireEvent.change(input, { target: { value: "New Group" } });
    });

    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/api/groups", {
        name: "New Group",
        createdById: "u1",
      });
    });
  });

  it("shows invite form when invite button clicked", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet
      .mockResolvedValueOnce({
        data: [{ id: "g1", name: "Family", createdById: "u1" }],
      })
      .mockResolvedValueOnce({
        data: [
          { id: "m1", user: { id: "u1", email: "a@test.com", name: "Alice" } },
        ],
      });

    render(
      <MemoryRouter>
        <Groups />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Family")).toBeInTheDocument();
    });

    const inviteBtn = screen.getByText("Invite Friends");
    fireEvent.click(inviteBtn);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Friend's email address"),
      ).toBeInTheDocument();
    });
  });

  it("submits invite form", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    vi.spyOn(window, "alert").mockImplementation(() => {});
    mockGet
      .mockResolvedValueOnce({
        data: [{ id: "g1", name: "Family", createdById: "u1" }],
      })
      .mockResolvedValueOnce({
        data: [
          { id: "m1", user: { id: "u1", email: "a@test.com", name: "Alice" } },
        ],
      });
    mockPost.mockResolvedValueOnce({
      data: { message: "Invited successfully" },
    });
    // After invite, groups reload
    mockGet
      .mockResolvedValueOnce({
        data: [{ id: "g1", name: "Family", createdById: "u1" }],
      })
      .mockResolvedValueOnce({
        data: [
          { id: "m1", user: { id: "u1", email: "a@test.com", name: "Alice" } },
        ],
      });

    render(
      <MemoryRouter>
        <Groups />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Family")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Invite Friends"));

    await waitFor(() => {
      const input = screen.getByPlaceholderText("Friend's email address");
      fireEvent.change(input, { target: { value: "new@test.com" } });
    });

    fireEvent.click(screen.getByText("Send Invitation"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/api/groups/g1/invite",
        expect.objectContaining({
          email: "new@test.com",
          invitedBy: "u1",
        }),
      );
    });
  });

  it("shows leave button for groups not owned by user", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet
      .mockResolvedValueOnce({
        data: [{ id: "g2", name: "Friends", createdById: "u2" }],
      })
      .mockResolvedValueOnce({
        data: [
          { id: "m1", user: { id: "u1", email: "a@test.com", name: "Alice" } },
          { id: "m2", user: { id: "u2", email: "b@test.com", name: "Bob" } },
        ],
      });

    render(
      <MemoryRouter>
        <Groups />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Friends")).toBeInTheDocument();
    });

    expect(screen.getByText("Leave Group")).toBeInTheDocument();
  });

  it("calls leave group API when confirmed", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockGet
      .mockResolvedValueOnce({
        data: [{ id: "g2", name: "Friends", createdById: "u2" }],
      })
      .mockResolvedValueOnce({
        data: [
          { id: "m1", user: { id: "u1", email: "a@test.com", name: "Alice" } },
          { id: "m2", user: { id: "u2", email: "b@test.com", name: "Bob" } },
        ],
      });
    mockDelete.mockResolvedValueOnce({});
    // reload after leave
    mockGet.mockResolvedValueOnce({ data: [] });

    render(
      <MemoryRouter>
        <Groups />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Friends")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Leave Group"));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("/api/groups/g2/members/u1");
    });
  });

  it("shows View Group button", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet
      .mockResolvedValueOnce({
        data: [{ id: "g1", name: "Family", createdById: "u1" }],
      })
      .mockResolvedValueOnce({
        data: [
          { id: "m1", user: { id: "u1", email: "a@test.com", name: "Alice" } },
        ],
      });

    render(
      <MemoryRouter>
        <Groups />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Family")).toBeInTheDocument();
    });

    expect(screen.getByText("View Group")).toBeInTheDocument();
  });

  it("shows OWNER badge for groups created by user", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet
      .mockResolvedValueOnce({
        data: [{ id: "g1", name: "Family", createdById: "u1" }],
      })
      .mockResolvedValueOnce({
        data: [
          { id: "m1", user: { id: "u1", email: "a@test.com", name: "Alice" } },
        ],
      });

    render(
      <MemoryRouter>
        <Groups />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("OWNER")).toBeInTheDocument();
    });
  });

  it("shows MEMBER badge for groups not created by user", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet
      .mockResolvedValueOnce({
        data: [{ id: "g2", name: "Friends", createdById: "u2" }],
      })
      .mockResolvedValueOnce({
        data: [
          { id: "m1", user: { id: "u1", email: "a@test.com", name: "Alice" } },
          { id: "m2", user: { id: "u2", email: "b@test.com", name: "Bob" } },
        ],
      });

    render(
      <MemoryRouter>
        <Groups />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("MEMBER")).toBeInTheDocument();
    });
  });

  it("shows member count", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet
      .mockResolvedValueOnce({
        data: [{ id: "g1", name: "Family", createdById: "u1" }],
      })
      .mockResolvedValueOnce({
        data: [
          { id: "m1", user: { id: "u1", email: "a@test.com", name: "Alice" } },
          { id: "m2", user: { id: "u2", email: "b@test.com", name: "Bob" } },
        ],
      });

    render(
      <MemoryRouter>
        <Groups />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("2 members")).toBeInTheDocument();
    });
  });

  it("handles data wrapped in data property", async () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    mockGet
      .mockResolvedValueOnce({
        data: {
          data: [{ id: "g1", name: "Wrapped", createdById: "u1" }],
        },
      })
      .mockResolvedValueOnce({
        data: [{ id: "m1", user: { id: "u1", email: "a@test.com" } }],
      });

    render(
      <MemoryRouter>
        <Groups />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Wrapped")).toBeInTheDocument();
    });
  });
});
