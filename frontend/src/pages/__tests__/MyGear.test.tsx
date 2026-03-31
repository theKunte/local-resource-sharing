import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockGet = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock("../../hooks/useFirebaseAuth", () => ({
  useFirebaseAuth: vi.fn(),
}));

vi.mock("../../utils/apiClient", () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
    post: vi.fn(),
    put: (...args: any[]) => mockPut(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}));

vi.mock("../../utils/errorHandler", () => ({
  logError: vi.fn(),
}));

import MyGear from "../MyGear";
import { useFirebaseAuth } from "../../hooks/useFirebaseAuth";

const mockAuth = useFirebaseAuth as ReturnType<typeof vi.fn>;

describe("MyGear", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading spinner while auth loads", () => {
    mockAuth.mockReturnValue({ user: null, loading: true });
    render(
      <MemoryRouter>
        <MyGear />
      </MemoryRouter>,
    );
    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });

  it("shows empty state when no gear", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <MyGear />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("My Gear")).toBeInTheDocument();
    });
  });

  it("renders gear items from API", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Hiking Boots",
          description: "Size 10",
          image: "data:image/png;base64,abc",
          ownerId: "u1",
          status: "AVAILABLE",
        },
        {
          id: "r2",
          title: "Sleeping Bag",
          description: "0°F rated",
          ownerId: "u1",
          status: "BORROWED",
        },
      ],
    });

    render(
      <MemoryRouter>
        <MyGear />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Hiking Boots")).toBeInTheDocument();
      expect(screen.getByText("Sleeping Bag")).toBeInTheDocument();
    });
  });

  it("shows stats card with counts", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({
      data: [
        { id: "r1", title: "A", ownerId: "u1", status: "AVAILABLE" },
        { id: "r2", title: "B", ownerId: "u1", status: "BORROWED" },
      ],
    });

    render(
      <MemoryRouter>
        <MyGear />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Total collection count
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  it("shows available and borrowed counts", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({
      data: [
        { id: "r1", title: "A", ownerId: "u1", status: "AVAILABLE" },
        { id: "r2", title: "B", ownerId: "u1", status: "BORROWED" },
        { id: "r3", title: "C", ownerId: "u1", status: "AVAILABLE" },
      ],
    });

    render(
      <MemoryRouter>
        <MyGear />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Available")).toBeInTheDocument();
      expect(screen.getByText("Borrowed")).toBeInTheDocument();
    });
  });

  it("deletes a resource when confirmed", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "dispatchEvent");
    mockGet.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Hiking Boots",
          description: "Size 10",
          ownerId: "u1",
          status: "AVAILABLE",
        },
      ],
    });
    mockDelete.mockResolvedValueOnce({});

    render(
      <MemoryRouter>
        <MyGear />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Hiking Boots")).toBeInTheDocument();
    });

    // GearCard renders a delete button
    const deleteBtn = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("/api/resources/r1", {
        data: { userId: "u1" },
      });
    });
  });

  it("does not delete when confirm is cancelled", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    vi.spyOn(window, "confirm").mockReturnValue(false);
    mockGet.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Hiking Boots",
          description: "Size 10",
          ownerId: "u1",
          status: "AVAILABLE",
        },
      ],
    });

    render(
      <MemoryRouter>
        <MyGear />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Hiking Boots")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteBtn);

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("opens edit modal when edit button clicked", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Hiking Boots",
          description: "Size 10",
          ownerId: "u1",
          status: "AVAILABLE",
        },
      ],
    });

    render(
      <MemoryRouter>
        <MyGear />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Hiking Boots")).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", { name: /edit/i });
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText("Edit Gear")).toBeInTheDocument();
      expect(screen.getByText("Save Changes")).toBeInTheDocument();
    });
  });

  it("cancels edit when prompt returns null", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    vi.spyOn(window, "prompt").mockReturnValue(null);
    mockGet.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Hiking Boots",
          description: "Size 10",
          ownerId: "u1",
          status: "AVAILABLE",
        },
      ],
    });

    render(
      <MemoryRouter>
        <MyGear />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Hiking Boots")).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", { name: /edit/i });
    fireEvent.click(editBtn);

    expect(mockPut).not.toHaveBeenCalled();
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
            title: "Wrapped Item",
            description: "Test",
            ownerId: "u1",
            status: "AVAILABLE",
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <MyGear />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Wrapped Item")).toBeInTheDocument();
    });
  });

  it("handles resource:updated event", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Old Title",
          description: "Desc",
          ownerId: "u1",
          status: "AVAILABLE",
        },
      ],
    });

    render(
      <MemoryRouter>
        <MyGear />
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
              description: "Desc",
              ownerId: "u1",
              status: "AVAILABLE",
            },
          },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("New Title")).toBeInTheDocument();
    });
  });

  it("handles resource:deleted event", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockGet.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "To Delete",
          description: "Desc",
          ownerId: "u1",
          status: "AVAILABLE",
        },
      ],
    });

    render(
      <MemoryRouter>
        <MyGear />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("To Delete")).toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("resource:deleted", {
          detail: { id: "r1" },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("To Delete")).not.toBeInTheDocument();
    });
  });

  it("shows status message after delete", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockGet.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Item",
          description: "D",
          ownerId: "u1",
          status: "AVAILABLE",
        },
      ],
    });
    mockDelete.mockResolvedValueOnce({});

    render(
      <MemoryRouter>
        <MyGear />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Item")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Resource deleted successfully"),
      ).toBeInTheDocument();
    });
  });

  it("shows error message when delete fails", async () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockGet.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Item",
          description: "D",
          ownerId: "u1",
          status: "AVAILABLE",
        },
      ],
    });
    mockDelete.mockRejectedValueOnce({
      response: { data: { error: "Cannot delete borrowed item" } },
    });

    render(
      <MemoryRouter>
        <MyGear />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Item")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Cannot delete borrowed item"),
      ).toBeInTheDocument();
    });
  });
});
