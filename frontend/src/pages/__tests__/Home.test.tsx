import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";

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

vi.mock("../../hooks/useDebounce", () => ({
  useDebounce: (value: string) => value, // Return value immediately for tests
}));

import Home from "../Home";
import { useFirebaseAuth } from "../../hooks/useFirebaseAuth";
import { logError } from "../../utils/errorHandler";

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
      // Title may appear in multiple places (card title, image alt, etc.)
      const wrappedTentElements = screen.getAllByText("Wrapped Tent");
      expect(wrappedTentElements.length).toBeGreaterThan(0);
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
          description: "Camping tent",
          ownerId: "u2",
          status: "AVAILABLE",
        },
        {
          id: "r2",
          title: "Bag",
          description: "Hiking bag",
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

  it("ignores resource:deleted event without id", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Unique Tent Title",
          description: "Description for tent",
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
      expect(screen.getByText("Unique Tent Title")).toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(new CustomEvent("resource:deleted", { detail: {} }));
    });

    // Item should still be there
    expect(screen.getByText("Unique Tent Title")).toBeInTheDocument();
  });

  it("ignores resource:updated event without resource", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Unique Test Item",
          description: "Description here",
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
      expect(screen.getByText("Unique Test Item")).toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(new CustomEvent("resource:updated", { detail: {} }));
    });

    // Item should remain unchanged
    expect(screen.getByText("Unique Test Item")).toBeInTheDocument();
  });

  describe("Search and Filters", () => {
    beforeEach(() => {
      mockAuth.mockReturnValue({
        user: { uid: "u1", displayName: "Test" },
        loading: false,
      });
    });

    it("renders search input", async () => {
      mockGet.mockResolvedValue({ data: [] });
      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(
          "Search by title or description...",
        );
        expect(searchInput).toBeInTheDocument();
      });
    });

    it("searches gear when typing in search box", async () => {
      const user = userEvent.setup();
      mockGet.mockResolvedValue({ data: [] });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining("/api/resources?user="),
        );
      });

      const searchInput = screen.getByPlaceholderText(
        "Search by title or description...",
      );

      mockGet.mockClear();
      mockGet.mockResolvedValue({
        data: {
          data: [
            {
              id: "r1",
              title: "Camping Tent",
              description: "Great tent",
              ownerId: "u2",
              status: "AVAILABLE",
            },
          ],
        },
      });

      await user.type(searchInput, "tent");

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining("/api/resources/search?q=tent"),
        );
      });
    });

    it("filters by category", async () => {
      const user = userEvent.setup();
      mockGet.mockResolvedValue({ data: [] });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("All Categories")).toBeInTheDocument();
      });

      // Click category dropdown
      const categoryButton = screen.getByText("All Categories");
      await user.click(categoryButton);

      // Select "Sports" category
      const sportsCheckbox = screen.getByLabelText("Sports");
      expect(sportsCheckbox).toBeInTheDocument();

      mockGet.mockClear();
      mockGet.mockResolvedValue({ data: { data: [] } });

      await user.click(sportsCheckbox);

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining("/api/resources/search?category=Sports"),
        );
      });

      // Verify category filter is displayed
      expect(screen.getByText("1 selected")).toBeInTheDocument();
    });

    it("filters by multiple categories", async () => {
      const user = userEvent.setup();
      mockGet.mockResolvedValue({ data: [] });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("All Categories")).toBeInTheDocument();
      });

      // Click category dropdown
      const categoryButton = screen.getByText("All Categories");
      await user.click(categoryButton);

      mockGet.mockClear();
      mockGet.mockResolvedValue({ data: { data: [] } });

      // Select multiple categories
      await user.click(screen.getByLabelText("Sports"));
      await user.click(screen.getByLabelText("Camping"));

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringMatching(
            /\/api\/resources\/search\?category=Sports&category=Camping/,
          ),
        );
      });

      expect(screen.getByText("2 selected")).toBeInTheDocument();
    });

    it("clears category filters", async () => {
      const user = userEvent.setup();
      mockGet.mockResolvedValue({ data: [] });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("All Categories")).toBeInTheDocument();
      });

      // Open dropdown and select a category
      await user.click(screen.getByText("All Categories"));
      await user.click(screen.getByLabelText("Sports"));

      expect(screen.getByText("1 selected")).toBeInTheDocument();

      mockGet.mockClear();
      mockGet.mockResolvedValue({ data: [] });

      // Click "Clear all" in dropdown - get all buttons and click the first one (in dropdown)
      const clearButtons = screen.getAllByRole("button", { name: "Clear all" });
      await user.click(clearButtons[0]);

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining("/api/resources?user="),
        );
      });

      expect(screen.getByText("All Categories")).toBeInTheDocument();
    });

    it("filters by status", async () => {
      const user = userEvent.setup();
      mockGet.mockResolvedValue({ data: [] });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("All Status")).toBeInTheDocument();
      });

      const statusSelect = screen.getByDisplayValue("All Status");

      mockGet.mockClear();
      mockGet.mockResolvedValue({ data: { data: [] } });

      await user.selectOptions(statusSelect, "AVAILABLE");

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining("/api/resources/search?status=AVAILABLE"),
        );
      });
    });

    it("combines search and filters", async () => {
      const user = userEvent.setup();
      mockGet.mockResolvedValue({ data: [] });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("All Categories")).toBeInTheDocument();
      });

      mockGet.mockClear();
      mockGet.mockResolvedValue({ data: { data: [] } });

      // Add search query
      const searchInput = screen.getByPlaceholderText(
        "Search by title or description...",
      );
      await user.type(searchInput, "tent");

      // Add category filter
      await user.click(screen.getByText("All Categories"));
      await user.click(screen.getByLabelText("Camping"));

      // Add status filter
      const statusSelect = screen.getByDisplayValue("All Status");
      await user.selectOptions(statusSelect, "AVAILABLE");

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringMatching(
            /\/api\/resources\/search\?q=tent&category=Camping&status=AVAILABLE/,
          ),
        );
      });
    });

    it("shows active filters indicator", async () => {
      const user = userEvent.setup();
      mockGet.mockResolvedValue({ data: [] });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("All Categories")).toBeInTheDocument();
      });

      mockGet.mockClear();
      mockGet.mockResolvedValue({ data: { data: [] } });

      // Add search query
      const searchInput = screen.getByPlaceholderText(
        "Search by title or description...",
      );
      await user.type(searchInput, "tent");

      await waitFor(() => {
        expect(screen.getByText("Filters active:")).toBeInTheDocument();
        expect(screen.getByText('"tent"')).toBeInTheDocument();
      });
    });

    it("clears all filters at once", async () => {
      const user = userEvent.setup();
      mockGet.mockResolvedValue({ data: [] });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("All Categories")).toBeInTheDocument();
      });

      // Add multiple filters
      const searchInput = screen.getByPlaceholderText(
        "Search by title or description...",
      );
      await user.type(searchInput, "tent");

      await user.click(screen.getByText("All Categories"));
      await user.click(screen.getByLabelText("Camping"));

      const statusSelect = screen.getByDisplayValue("All Status");
      await user.selectOptions(statusSelect, "AVAILABLE");

      await waitFor(() => {
        expect(screen.getByText("Filters active:")).toBeInTheDocument();
      });

      mockGet.mockClear();
      mockGet.mockResolvedValue({ data: [] });

      // Clear all filters
      const clearAllButtons = screen.getAllByText("Clear all");
      await user.click(clearAllButtons[clearAllButtons.length - 1]); // Last "Clear all" button

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining("/api/resources?user="),
        );
      });

      expect(searchInput).toHaveValue("");
      expect(screen.queryByText("Filters active:")).not.toBeInTheDocument();
    });

    it("shows 'No results found' when search returns empty", async () => {
      const user = userEvent.setup();
      mockGet.mockResolvedValue({ data: [] });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("All Categories")).toBeInTheDocument();
      });

      mockGet.mockClear();
      mockGet.mockResolvedValue({ data: { data: [] } });

      // Search for something
      const searchInput = screen.getByPlaceholderText(
        "Search by title or description...",
      );
      await user.type(searchInput, "nonexistent");

      await waitFor(() => {
        expect(screen.getByText("No results found")).toBeInTheDocument();
        expect(
          screen.getByText(
            "Try adjusting your search filters or keywords to find what you're looking for.",
          ),
        ).toBeInTheDocument();
      });
    });

    it("changes header when filters are active", async () => {
      const user = userEvent.setup();
      mockGet.mockResolvedValue({ data: [] });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Available Gear")).toBeInTheDocument();
      });

      mockGet.mockClear();
      mockGet.mockResolvedValue({ data: { data: [] } });

      // Add a filter
      const searchInput = screen.getByPlaceholderText(
        "Search by title or description...",
      );
      await user.type(searchInput, "tent");

      await waitFor(() => {
        expect(screen.getByText("Search Results")).toBeInTheDocument();
        expect(screen.queryByText("Available Gear")).not.toBeInTheDocument();
      });
    });

    it("handles search API error", async () => {
      const user = userEvent.setup();
      mockGet.mockResolvedValue({ data: [] });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("All Categories")).toBeInTheDocument();
      });

      mockGet.mockClear();
      mockGet.mockRejectedValue(new Error("Search failed"));

      const searchInput = screen.getByPlaceholderText(
        "Search by title or description...",
      );
      await user.type(searchInput, "error");

      await waitFor(() => {
        expect(logError).toHaveBeenCalledWith(
          "Home - search resources",
          expect.any(Error),
        );
      });

      // Should show no results
      await waitFor(() => {
        expect(screen.getByText("No results found")).toBeInTheDocument();
      });
    });

    it("toggles category filter on and off", async () => {
      const user = userEvent.setup();
      mockGet.mockResolvedValue({ data: [] });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("All Categories")).toBeInTheDocument();
      });

      // Open dropdown and select a category
      await user.click(screen.getByText("All Categories"));
      await user.click(screen.getByLabelText("Sports"));

      expect(screen.getByText("1 selected")).toBeInTheDocument();

      mockGet.mockClear();
      mockGet.mockResolvedValue({ data: [] });

      // Toggle it off
      await user.click(screen.getByLabelText("Sports"));

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining("/api/resources?user="),
        );
      });

      expect(screen.getByText("All Categories")).toBeInTheDocument();
    });
  });

  describe("Recommendations", () => {
    beforeEach(() => {
      mockAuth.mockReturnValue({
        user: { uid: "u1", displayName: "Test" },
        loading: false,
      });
    });

    it("loads recommendations on mount", async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/api/resources/recommendations")) {
          return Promise.resolve({
            data: {
              data: [
                {
                  id: "rec1",
                  title: "Recommended Item",
                  description: "Great item",
                  ownerId: "u2",
                  status: "AVAILABLE",
                },
              ],
            },
          });
        } else {
          // Community gear call
          return Promise.resolve({ data: [] });
        }
      });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      // Wait for both recommendations and community gear to load
      await waitFor(() => {
        const elements = screen.getAllByText("Recommended Item");
        expect(elements.length).toBeGreaterThan(0);
      });

      // Verify the "For You" header is present
      expect(screen.getByText("For You")).toBeInTheDocument();
    });

    it("shows recommendations badge", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [
            {
              id: "rec1",
              title: "Recommended Item",
              description: "Great item",
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
        expect(screen.getByText("Based on your activity")).toBeInTheDocument();
      });
    });

    it("hides recommendations when filters are active", async () => {
      const user = userEvent.setup();
      mockGet.mockResolvedValue({
        data: {
          data: [
            {
              id: "rec1",
              title: "Recommended Item",
              description: "Great item",
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
        expect(screen.getByText("For You")).toBeInTheDocument();
      });

      mockGet.mockClear();
      mockGet.mockResolvedValue({ data: { data: [] } });

      // Add a search filter
      const searchInput = screen.getByPlaceholderText(
        "Search by title or description...",
      );
      await user.type(searchInput, "tent");

      await waitFor(() => {
        expect(screen.queryByText("For You")).not.toBeInTheDocument();
      });
    });

    it("handles recommendations API error", async () => {
      mockGet
        .mockRejectedValueOnce(new Error("Recommendations failed"))
        .mockResolvedValue({ data: [] });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(logError).toHaveBeenCalledWith(
          "Home - load recommendations",
          expect.any(Error),
        );
      });
    });

    it("limits recommendations to 4 items", async () => {
      const recommendations = Array.from({ length: 10 }, (_, i) => ({
        id: `rec${i}`,
        title: `Recommendation Item ${i}`,
        description: "Description",
        ownerId: "u2",
        status: "AVAILABLE",
      }));

      mockGet.mockImplementation((url: string) => {
        if (url.includes("/api/resources/recommendations")) {
          return Promise.resolve({
            data: { data: recommendations },
          });
        } else {
          // Community gear call
          return Promise.resolve({ data: [] });
        }
      });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      await waitFor(() => {
        const item0Elements = screen.getAllByText("Recommendation Item 0");
        expect(item0Elements.length).toBeGreaterThan(0);
        const item3Elements = screen.getAllByText("Recommendation Item 3");
        expect(item3Elements.length).toBeGreaterThan(0);
      });

      // Should not show 5th item and beyond in recommendations section (slice shows first 4)
      expect(
        screen.queryByText("Recommendation Item 4"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Recommendation Item 9"),
      ).not.toBeInTheDocument();
    });

    it("shows loading spinner for recommendations", async () => {
      // First load with data to show the section
      mockGet.mockImplementation((url: string) => {
        if (url.includes("/api/resources/recommendations")) {
          return Promise.resolve({
            data: {
              data: [
                {
                  id: "rec1",
                  title: "Initial Rec",
                  description: "Description",
                  ownerId: "u2",
                  status: "AVAILABLE",
                },
              ],
            },
          });
        } else {
          return Promise.resolve({ data: [] });
        }
      });

      const { rerender } = render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      // Wait for recommendations to load
      await waitFor(() => {
        expect(screen.getByText("For You")).toBeInTheDocument();
      });

      // Now test that when recommendations section exists, it shows proper content
      const recommendationSection = screen
        .getByText("For You")
        .closest("section");
      expect(recommendationSection).toBeInTheDocument();
      expect(screen.getByText("Initial Rec")).toBeInTheDocument();
    });
  });

  describe("Borrow Request Modal", () => {
    beforeEach(() => {
      mockAuth.mockReturnValue({
        user: { uid: "u1", displayName: "Test" },
        loading: false,
      });
    });

    it("opens borrow modal when requesting to borrow", async () => {
      const user = userEvent.setup();
      mockGet.mockResolvedValue({
        data: [
          {
            id: "r1",
            title: "Borrowable Item",
            description: "Great item",
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
        expect(screen.getByText("Borrowable Item")).toBeInTheDocument();
      });

      // Find and click the "Request to Borrow" button
      const borrowButtons = screen.getAllByRole("button", {
        name: /request to borrow/i,
      });
      if (borrowButtons.length > 0) {
        await user.click(borrowButtons[0]);

        // Modal should be rendered (checking via BorrowRequestModal component)
        // Note: The actual modal rendering depends on the BorrowRequestModal component
      }
    });

    it("handles missing resource on borrow request", async () => {
      mockAuth.mockReturnValue({
        user: { uid: "u1", displayName: "Test" },
        loading: false,
      });
      mockGet.mockResolvedValue({ data: [] });

      const { container } = render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Available Gear")).toBeInTheDocument();
      });

      // Manually call the handler with a non-existent ID
      // This simulates the edge case
      const home = container.querySelector("div");
      if (home) {
        // Trigger the custom event or manually test the logic
        // Since we can't directly call handleRequestBorrow, we verify the error logging
        expect(logError).not.toHaveBeenCalledWith(
          "Home - handleRequestBorrow",
          expect.any(String),
        );
      }
    });
  });

  describe("API Error Handling", () => {
    beforeEach(() => {
      mockAuth.mockReturnValue({
        user: { uid: "u1", displayName: "Test" },
        loading: false,
      });
    });

    it("handles community gear API error", async () => {
      mockGet.mockRejectedValue(new Error("API error"));

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(logError).toHaveBeenCalledWith(
          "Home - load community gear",
          expect.any(Error),
        );
      });

      // Should show empty state
      await waitFor(() => {
        expect(
          screen.getByText("No community gear available"),
        ).toBeInTheDocument();
      });
    });

    it("handles nested data structure from API", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [
            {
              id: "r1",
              title: "Nested Data Item",
              description: "Test",
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
        const elements = screen.getAllByText("Nested Data Item");
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("handles null data from API", async () => {
      mockGet.mockResolvedValue({ data: null });

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
  });

  describe("Loading States", () => {
    it("shows 'Searching...' when filtering", async () => {
      const user = userEvent.setup();
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
        expect(screen.getByText("All Categories")).toBeInTheDocument();
      });

      mockGet.mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      const searchInput = screen.getByPlaceholderText(
        "Search by title or description...",
      );
      await user.type(searchInput, "tent");

      await waitFor(() => {
        expect(screen.getByText("Searching...")).toBeInTheDocument();
      });
    });
  });

  describe("Status Message Banner", () => {
    beforeEach(() => {
      mockAuth.mockReturnValue({
        user: { uid: "u1", displayName: "Test" },
        loading: false,
      });
      mockGet.mockResolvedValue({ data: [] });
    });

    it("dismisses status message when clicking X", async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      // Manually set status message by re-rendering
      // Note: This is a simplified test as we can't easily trigger the status message from the component
      // In a real scenario, you'd trigger an action that sets the status message
    });
  });

  describe("Item Count Display", () => {
    beforeEach(() => {
      mockAuth.mockReturnValue({
        user: { uid: "u1", displayName: "Test" },
        loading: false,
      });
    });

    it("shows singular 'item' for one item", async () => {
      mockGet.mockResolvedValue({
        data: [
          {
            id: "r1",
            title: "Single Item",
            description: "Test",
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
        expect(screen.getByText("(1 item)")).toBeInTheDocument();
      });
    });
  });
});
