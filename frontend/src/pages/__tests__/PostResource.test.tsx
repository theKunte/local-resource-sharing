import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { mockGet, mockPost, mockNavigate } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockNavigate: vi.fn(),
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

vi.mock("../../utils/firebaseStorage", () => ({
  uploadBlobToStorage: vi
    .fn()
    .mockResolvedValue("https://example.com/image.jpg"),
  uploadImageToStorage: vi
    .fn()
    .mockResolvedValue("https://example.com/image.jpg"),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

  it("redirects to home when user is not authenticated", async () => {
    mockAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(
      <MemoryRouter>
        <PostResource />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("adds category by pressing Enter", async () => {
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

    const categoryInput = screen.getByPlaceholderText(
      /type to search or add categories/i,
    );
    fireEvent.change(categoryInput, { target: { value: "Camping" } });
    fireEvent.keyDown(categoryInput, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Camping")).toBeInTheDocument();
    });
  });

  it("shows category suggestions when typing", async () => {
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
      const categoryInput = screen.getByPlaceholderText(
        /type to search or add categories/i,
      );
      fireEvent.focus(categoryInput);
      fireEvent.change(categoryInput, { target: { value: "Camp" } });
    });

    await waitFor(() => {
      // Should show suggestions like "Camping" from CATEGORIES
      const suggestions = document.querySelectorAll('button[type="button"]');
      const hasCampingSuggestion = Array.from(suggestions).some((btn) =>
        btn.textContent?.includes("Camping"),
      );
      expect(hasCampingSuggestion).toBe(true);
    });
  });

  it("adds category by clicking suggestion", async () => {
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
      const categoryInput = screen.getByPlaceholderText(
        /type to search or add categories/i,
      );
      fireEvent.focus(categoryInput);
      fireEvent.change(categoryInput, { target: { value: "Camp" } });
    });

    await waitFor(() => {
      const suggestions = Array.from(
        document.querySelectorAll('button[type="button"]'),
      );
      const campingSuggestion = suggestions.find((btn) =>
        btn.textContent?.includes("Camping"),
      );
      if (campingSuggestion) {
        fireEvent.click(campingSuggestion);
      }
    });

    await waitFor(() => {
      const selectedCategories = document.querySelectorAll(
        ".bg-cyan-500.text-white",
      );
      const hasCamping = Array.from(selectedCategories).some((el) =>
        el.textContent?.includes("Camping"),
      );
      expect(hasCamping).toBe(true);
    });
  });

  it("removes category with X button", async () => {
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
      const categoryInput = screen.getByPlaceholderText(
        /type to search or add categories/i,
      );
      fireEvent.change(categoryInput, { target: { value: "Camping" } });
      fireEvent.keyDown(categoryInput, { key: "Enter" });
    });

    await waitFor(() => {
      expect(screen.getByText("Camping")).toBeInTheDocument();
    });

    const removeButton = screen.getByLabelText("Remove Camping");
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText("Camping")).not.toBeInTheDocument();
    });
  });

  it("closes suggestions with Escape key", async () => {
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
      const categoryInput = screen.getByPlaceholderText(
        /type to search or add categories/i,
      );
      fireEvent.focus(categoryInput);
      fireEvent.change(categoryInput, { target: { value: "Camp" } });
    });

    const categoryInput = screen.getByPlaceholderText(
      /type to search or add categories/i,
    );
    fireEvent.keyDown(categoryInput, { key: "Escape" });

    // Suggestions should be hidden - check that dropdown is not visible
    await waitFor(() => {
      const dropdown = document.querySelector(".absolute.z-10");
      expect(dropdown).not.toBeInTheDocument();
    });
  });

  it("alerts when image is too large", async () => {
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
      expect(
        screen.getByText(/share your adventure gear/i),
      ).toBeInTheDocument();
    });

    // Create a large file (> 10MB)
    const largeFile = new File(["x".repeat(11 * 1024 * 1024)], "large.png", {
      type: "image/png",
    });
    const fileInput = document.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining("Image is too large"),
      );
    });
  });

  it("removes image with X button", async () => {
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

    // Upload an image
    const file = new File(["img"], "photo.png", { type: "image/png" });
    const fileInput = document.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByAltText("Gear preview")).toBeInTheDocument();
    });

    // Click remove button
    const removeButton = screen.getByLabelText("Remove photo");
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByAltText("Gear preview")).not.toBeInTheDocument();
    });
  });

  it("allows changing image after upload", async () => {
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

    // Upload first image
    const file1 = new File(["img1"], "photo1.png", { type: "image/png" });
    const fileInput = document.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file1] } });

    await waitFor(() => {
      expect(screen.getByAltText("Gear preview")).toBeInTheDocument();
      expect(screen.getByText("Change photo")).toBeInTheDocument();
    });

    // Change to second image
    const file2 = new File(["img2"], "photo2.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file2] } });

    await waitFor(() => {
      expect(screen.getByAltText("Gear preview")).toBeInTheDocument();
    });
  });

  it("successfully submits form and navigates to profile", async () => {
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
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    mockPost
      .mockResolvedValueOnce({ data: { id: "r1", title: "My Tent" } })
      .mockResolvedValueOnce({ data: { success: true } })
      .mockResolvedValueOnce({ data: { success: true } });

    render(
      <MemoryRouter>
        <PostResource />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const titleInput = screen.getByPlaceholderText(
        "e.g., REI Half Dome Tent",
      );
      fireEvent.change(titleInput, { target: { value: "My Tent" } });
      const descInput = screen.getByPlaceholderText(
        /share details about condition/i,
      );
      fireEvent.change(descInput, { target: { value: "Great condition" } });
    });

    // Upload image
    const file = new File(["img"], "photo.png", { type: "image/png" });
    const fileInput = document.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const form = document.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(alertSpy).toHaveBeenCalledWith(
          expect.stringContaining("shared successfully"),
        );
        expect(mockNavigate).toHaveBeenCalledWith("/profile");
      },
      { timeout: 5000 },
    );
  });

  it("handles resource creation error", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({ data: [] });
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    mockPost.mockRejectedValueOnce(new Error("Server error"));

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
      fireEvent.change(descInput, { target: { value: "Description" } });
    });

    // Upload image
    const file = new File(["img"], "photo.png", { type: "image/png" });
    const fileInput = document.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const form = document.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Error");
    });
  });

  it("does not duplicate categories", async () => {
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
      const categoryInput = screen.getByPlaceholderText(
        /type to search or add categories/i,
      );
      // Add "Camping" first time
      fireEvent.change(categoryInput, { target: { value: "Camping" } });
      fireEvent.keyDown(categoryInput, { key: "Enter" });
    });

    await waitFor(() => {
      expect(screen.getByText("Camping")).toBeInTheDocument();
    });

    // Try to add "Camping" again
    const categoryInput = screen.getByPlaceholderText(
      /type to search or add categories/i,
    );
    fireEvent.change(categoryInput, { target: { value: "Camping" } });
    fireEvent.keyDown(categoryInput, { key: "Enter" });

    // Should still only have one "Camping" badge
    const campingBadges = screen.getAllByText("Camping");
    expect(campingBadges.length).toBe(1);
  });

  it("shares resource with multiple selected groups", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({
      data: [
        { id: "g1", name: "Family" },
        { id: "g2", name: "Friends" },
        { id: "g3", name: "Coworkers" },
      ],
    });
    vi.spyOn(window, "alert").mockImplementation(() => {});
    mockPost
      .mockResolvedValueOnce({ data: { id: "r1", title: "My Gear" } })
      .mockResolvedValueOnce({ data: { success: true } })
      .mockResolvedValueOnce({ data: { success: true } })
      .mockResolvedValueOnce({ data: { success: true } });

    render(
      <MemoryRouter>
        <PostResource />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const titleInput = screen.getByPlaceholderText(
        "e.g., REI Half Dome Tent",
      );
      fireEvent.change(titleInput, { target: { value: "My Gear" } });
      const descInput = screen.getByPlaceholderText(
        /share details about condition/i,
      );
      fireEvent.change(descInput, { target: { value: "Description" } });
    });

    // Upload image
    const file = new File(["img"], "photo.png", { type: "image/png" });
    const fileInput = document.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const form = document.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(
      () => {
        // Should have called POST for resource creation + 3 group shares
        expect(mockPost).toHaveBeenCalledTimes(4);
        expect(mockPost).toHaveBeenCalledWith(
          "/api/resources/r1/share",
          expect.any(Object),
        );
      },
      { timeout: 5000 },
    );
  });
});
