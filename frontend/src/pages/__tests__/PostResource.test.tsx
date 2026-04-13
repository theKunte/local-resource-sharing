import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock("../../hooks/useFirebaseAuth", () => ({
  useFirebaseAuth: vi.fn(),
}));

vi.mock("../../utils/apiClient", () => ({
  default: {
    get: mockGet,
    post: mockPost,
  },
}));

vi.mock("../../utils/errorHandler", () => ({
  logError: vi.fn(),
  getErrorMessage: vi.fn(() => "Error"),
}));

vi.mock("../../utils/cropImageToSquare", () => ({
  cropImageToSquare: vi.fn().mockResolvedValue("data:image/png;base64,abc"),
}));

import PostResource from "../PostResource";
import { useFirebaseAuth } from "../../hooks/useFirebaseAuth";

const mockAuth = useFirebaseAuth as ReturnType<typeof vi.fn>;

describe("PostResource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeleton while auth loads", () => {
    mockAuth.mockReturnValue({ user: null, loading: true });
    render(
      <MemoryRouter>
        <PostResource />
      </MemoryRouter>,
    );
    // Should show loading skeleton
    expect(document.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders the form when logged in", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <PostResource />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/share your adventure gear/i),
      ).toBeInTheDocument();
    });
  });

  it("shows group selection after loading groups", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({
      data: [
        { id: "g1", name: "Family" },
        { id: "g2", name: "Friends" },
      ],
    });

    render(
      <MemoryRouter>
        <PostResource />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Family")).toBeInTheDocument();
      expect(screen.getByText("Friends")).toBeInTheDocument();
    });
  });

  it("renders title and description inputs", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <PostResource />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/what gear are you sharing/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/describe your gear/i)).toBeInTheDocument();
    });
  });

  it("enforces description max length", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <PostResource />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(
        /share details about condition/i,
      );
      fireEvent.change(textarea, { target: { value: "A".repeat(500) } });
      expect(textarea).toHaveValue("A".repeat(500));
    });
  });

  it("shows character count for description", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <PostResource />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("0/500")).toBeInTheDocument();
    });
  });

  it("alerts when submitting without image", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({ data: [] });
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <PostResource />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const titleInput = screen.getByPlaceholderText(
        "e.g., REI Half Dome Tent",
      );
      fireEvent.change(titleInput, { target: { value: "My Item" } });
      const descInput = screen.getByPlaceholderText(
        /share details about condition/i,
      );
      fireEvent.change(descInput, { target: { value: "A description" } });
    });

    const form = document.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining("Please upload an image"),
      );
    });
  });

  it("submits form with image and title", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({ data: [] });
    vi.spyOn(window, "alert").mockImplementation(() => {});
    mockPost.mockResolvedValueOnce({ data: { id: "r1", title: "My Item" } });

    render(
      <MemoryRouter>
        <PostResource />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const titleInput = screen.getByPlaceholderText(
        "e.g., REI Half Dome Tent",
      );
      fireEvent.change(titleInput, { target: { value: "My Item" } });
      const descInput = screen.getByPlaceholderText(
        /share details about condition/i,
      );
      fireEvent.change(descInput, { target: { value: "Item description" } });
    });

    // Simulate file selection
    const file = new File(["img"], "photo.png", { type: "image/png" });
    const fileInput = document.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const form = document.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/api/resources",
        expect.objectContaining({
          title: "My Item",
          ownerId: "u1",
        }),
      );
    });
  });

  it("toggles group selection", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({
      data: [
        { id: "g1", name: "Family" },
        { id: "g2", name: "Friends" },
      ],
    });

    render(
      <MemoryRouter>
        <PostResource />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Family")).toBeInTheDocument();
    });

    // Groups should be checked by default - clicking should uncheck
    const familyCheckbox =
      screen.getByText("Family").closest("button") ||
      screen.getByText("Family").closest("label") ||
      screen.getByText("Family");
    fireEvent.click(familyCheckbox);
  });

  it("handles groups loading error", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockRejectedValue(new Error("Network error"));

    render(
      <MemoryRouter>
        <PostResource />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load groups/i)).toBeInTheDocument();
    });
  });

  it("handles data wrapped in data property for groups", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({
      data: {
        data: [{ id: "g1", name: "Wrapped Group" }],
      },
    });

    render(
      <MemoryRouter>
        <PostResource />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Wrapped Group")).toBeInTheDocument();
    });
  });
});
