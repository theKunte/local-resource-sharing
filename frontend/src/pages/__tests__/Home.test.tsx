import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock("../../hooks/useFirebaseAuth", () => ({
  useFirebaseAuth: vi.fn(),
}));

vi.mock("../../utils/apiClient", () => ({
  default: {
    get: mockGet,
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../../utils/errorHandler", () => ({
  logError: vi.fn(),
  getErrorMessage: vi.fn((_e) => "Error"),
}));

import Home from "../Home";
import { useFirebaseAuth } from "../../hooks/useFirebaseAuth";

const mockAuth = useFirebaseAuth as ReturnType<typeof vi.fn>;

describe("Home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading spinner while auth is loading", () => {
    mockAuth.mockReturnValue({ user: null, loading: true });
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getByText("Loading your dashboard...")).toBeInTheDocument();
  });

  it("shows sign-in prompt when not logged in", () => {
    mockAuth.mockReturnValue({ user: null, loading: false });
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getByText(/please log in/i)).toBeInTheDocument();
  });

  it("shows dashboard when logged in", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(screen.getByText("Explore Community Gear")).toBeInTheDocument();
  });

  it("renders gear cards from API", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Camping Tent",
          description: "2-person tent",
          image: "data:image/png;base64,abc",
          ownerId: "u2",
          status: "AVAILABLE",
        },
      ],
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Camping Tent")).toBeInTheDocument();
    });
  });

  it("shows empty community gear message", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("No community gear available"),
      ).toBeInTheDocument();
    });
  });

  it("shows loading spinner for community gear", () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading community gear...")).toBeInTheDocument();
  });

  it("shows item count when gear available", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Tent",
          description: "Tent",
          ownerId: "u2",
          status: "AVAILABLE",
        },
        {
          id: "r2",
          title: "Bag",
          description: "Bag",
          ownerId: "u2",
          status: "AVAILABLE",
        },
      ],
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("(2 items)")).toBeInTheDocument();
    });
  });

  it("handles data wrapped in data property", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({
      data: {
        data: [
          {
            id: "r1",
            title: "Wrapped Tent",
            description: "Tent",
            ownerId: "u2",
            status: "AVAILABLE",
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Wrapped Tent")).toBeInTheDocument();
    });
  });

  it("removes item on resource:deleted event", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Tent",
          description: "Tent",
          ownerId: "u2",
          status: "AVAILABLE",
        },
        {
          id: "r2",
          title: "Bag",
          description: "Bag",
          ownerId: "u2",
          status: "AVAILABLE",
        },
      ],
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Tent")).toBeInTheDocument();
      expect(screen.getByText("Bag")).toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("resource:deleted", { detail: { id: "r1" } }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("Tent")).not.toBeInTheDocument();
      expect(screen.getByText("Bag")).toBeInTheDocument();
    });
  });

  it("updates item on resource:updated event", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Old Title",
          description: "Tent",
          ownerId: "u2",
          status: "AVAILABLE",
        },
      ],
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Old Title")).toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("resource:updated", {
          detail: {
            resource: {
              id: "r1",
              title: "New Title",
              description: "Tent",
              ownerId: "u2",
              status: "AVAILABLE",
            },
          },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("New Title")).toBeInTheDocument();
      expect(screen.queryByText("Old Title")).not.toBeInTheDocument();
    });
  });
});
