import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockGet = vi.fn();

vi.mock("../../hooks/useFirebaseAuth", () => ({
  useFirebaseAuth: vi.fn(),
}));

vi.mock("../../utils/apiClient", () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
  },
}));

vi.mock("../../utils/errorHandler", () => ({
  logError: vi.fn(),
}));

import Profile from "../Profile";
import { useFirebaseAuth } from "../../hooks/useFirebaseAuth";

const mockAuth = useFirebaseAuth as ReturnType<typeof vi.fn>;

describe("Profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state", () => {
    mockAuth.mockReturnValue({
      user: null,
      loading: true,
      signOutUser: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders profile info for logged-in user", async () => {
    mockAuth.mockReturnValue({
      user: {
        uid: "u1",
        displayName: "Alice Smith",
        email: "alice@test.com",
        photoURL: "https://example.com/photo.jpg",
        metadata: { creationTime: "2024-01-15T00:00:00Z" },
        providerData: [{ providerId: "google.com" }],
      },
      loading: false,
      signOutUser: vi.fn(),
    });
    mockGet.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("alice@test.com")).toBeInTheDocument();
  });

  it("shows user avatar image when photoURL exists", async () => {
    mockAuth.mockReturnValue({
      user: {
        uid: "u1",
        displayName: "Bob",
        email: "bob@test.com",
        photoURL: "https://example.com/bob.jpg",
        metadata: {},
        providerData: [{ providerId: "google.com" }],
      },
      loading: false,
      signOutUser: vi.fn(),
    });
    mockGet.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    const avatar = screen.getByAltText("Bob");
    expect(avatar).toHaveAttribute("src", "https://example.com/bob.jpg");
  });

  it("shows initial letter when no photoURL", async () => {
    mockAuth.mockReturnValue({
      user: {
        uid: "u1",
        displayName: "Carol",
        email: "carol@test.com",
        photoURL: null,
        metadata: {},
        providerData: [{ providerId: "password" }],
      },
      loading: false,
      signOutUser: vi.fn(),
    });
    mockGet.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("shows stats with gear and group counts", async () => {
    mockAuth.mockReturnValue({
      user: {
        uid: "u1",
        displayName: "Dave",
        email: "dave@test.com",
        photoURL: null,
        metadata: {},
        providerData: [{ providerId: "google.com" }],
      },
      loading: false,
      signOutUser: vi.fn(),
    });

    mockGet.mockImplementation((url: string) => {
      if (url.includes("/api/resources")) {
        return Promise.resolve({
          data: [
            { id: "r1", sharedWith: [{ id: "s1" }] },
            { id: "r2", sharedWith: [] },
          ],
        });
      }
      if (url.includes("/api/groups")) {
        return Promise.resolve({ data: [{ id: "g1" }, { id: "g2" }] });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Gear")).toBeInTheDocument();
      expect(screen.getByText("Groups")).toBeInTheDocument();
    });
  });

  it("shows sign out button and calls signOutUser", async () => {
    const mockSignOut = vi.fn().mockResolvedValue(undefined);
    mockAuth.mockReturnValue({
      user: {
        uid: "u1",
        displayName: "Eve",
        email: "eve@test.com",
        photoURL: null,
        metadata: {},
        providerData: [{ providerId: "google.com" }],
      },
      loading: false,
      signOutUser: mockSignOut,
    });
    mockGet.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    const signOutBtn = screen.getByText("Sign Out");
    fireEvent.click(signOutBtn);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it("shows member since date", () => {
    mockAuth.mockReturnValue({
      user: {
        uid: "u1",
        displayName: "Frank",
        email: "frank@test.com",
        photoURL: null,
        metadata: { creationTime: "2024-01-15T00:00:00Z" },
        providerData: [{ providerId: "google.com" }],
      },
      loading: false,
      signOutUser: vi.fn(),
    });
    mockGet.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    expect(screen.getByText(/member since/i)).toBeInTheDocument();
  });

  it("shows Google as sign-in provider", () => {
    mockAuth.mockReturnValue({
      user: {
        uid: "u1",
        displayName: "Grace",
        email: "grace@test.com",
        photoURL: null,
        metadata: {},
        providerData: [{ providerId: "google.com" }],
      },
      loading: false,
      signOutUser: vi.fn(),
    });
    mockGet.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    expect(screen.getByText("Google")).toBeInTheDocument();
  });

  it("shows quick links", () => {
    mockAuth.mockReturnValue({
      user: {
        uid: "u1",
        displayName: "Hank",
        email: "hank@test.com",
        photoURL: null,
        metadata: {},
        providerData: [{ providerId: "google.com" }],
      },
      loading: false,
      signOutUser: vi.fn(),
    });
    mockGet.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    expect(screen.getByText("My Gear")).toBeInTheDocument();
    expect(screen.getByText("My Groups")).toBeInTheDocument();
    expect(screen.getByText("Requests")).toBeInTheDocument();
  });

  it("shows shared count from resources with sharedWith", async () => {
    mockAuth.mockReturnValue({
      user: {
        uid: "u1",
        displayName: "Ivy",
        email: "ivy@test.com",
        photoURL: null,
        metadata: {},
        providerData: [{ providerId: "google.com" }],
      },
      loading: false,
      signOutUser: vi.fn(),
    });
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/api/resources")) {
        return Promise.resolve({
          data: [
            { id: "r1", sharedWith: [{ id: "s1" }] },
            { id: "r2", sharedWith: [{ id: "s2" }] },
            { id: "r3", sharedWith: [] },
          ],
        });
      }
      if (url.includes("/api/groups")) {
        return Promise.resolve({ data: [{ id: "g1" }] });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Shared")).toBeInTheDocument();
    });
  });
});
