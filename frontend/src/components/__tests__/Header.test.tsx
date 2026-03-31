import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

// Mock useFirebaseAuth
vi.mock("../../hooks/useFirebaseAuth", () => ({
  useFirebaseAuth: vi.fn(),
}));

// Mock useActionableCount
vi.mock("../../hooks/useActionableCount", () => ({
  useActionableCount: vi.fn(() => 0),
}));

import Header from "../Header";
import { useFirebaseAuth } from "../../hooks/useFirebaseAuth";

const mockUseFirebaseAuth = useFirebaseAuth as ReturnType<typeof vi.fn>;

function renderHeader(actionableCount?: number) {
  return render(
    <MemoryRouter>
      <Header actionableCount={actionableCount ?? null} />
    </MemoryRouter>,
  );
}

describe("Header", () => {
  it("renders the app name", () => {
    mockUseFirebaseAuth.mockReturnValue({
      user: null,
      signOutUser: vi.fn(),
    });
    renderHeader();
    expect(screen.getByText("GearShare")).toBeInTheDocument();
  });

  it("shows nav links when user is logged in", () => {
    mockUseFirebaseAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test", photoURL: null },
      signOutUser: vi.fn(),
    });
    renderHeader();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Groups")).toBeInTheDocument();
    expect(screen.getByText("Add Gear")).toBeInTheDocument();
    expect(screen.getByText("My Gear")).toBeInTheDocument();
    expect(screen.getByText("Requests")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  it("hides nav links when user is not logged in", () => {
    mockUseFirebaseAuth.mockReturnValue({
      user: null,
      signOutUser: vi.fn(),
    });
    renderHeader();
    expect(screen.queryByText("Logout")).not.toBeInTheDocument();
    expect(screen.queryByText("Home")).not.toBeInTheDocument();
  });

  it("shows user avatar when photoURL exists", () => {
    mockUseFirebaseAuth.mockReturnValue({
      user: {
        uid: "u1",
        displayName: "Alice",
        photoURL: "https://example.com/photo.jpg",
      },
      signOutUser: vi.fn(),
    });
    renderHeader();
    const avatar = screen.getByAltText("Alice");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("src", "https://example.com/photo.jpg");
  });

  it("uses 'User' as fallback alt text when displayName is null", () => {
    mockUseFirebaseAuth.mockReturnValue({
      user: {
        uid: "u1",
        displayName: null,
        photoURL: "https://example.com/photo.jpg",
      },
      signOutUser: vi.fn(),
    });
    renderHeader();
    expect(screen.getByAltText("User")).toBeInTheDocument();
  });

  it("does not render avatar when photoURL is null", () => {
    mockUseFirebaseAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Bob", photoURL: null },
      signOutUser: vi.fn(),
    });
    renderHeader();
    expect(screen.queryByAltText("Bob")).not.toBeInTheDocument();
  });

  it("calls signOutUser when Logout is clicked and confirmed", async () => {
    const mockSignOut = vi.fn().mockResolvedValue(undefined);
    mockUseFirebaseAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test", photoURL: null },
      signOutUser: mockSignOut,
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderHeader();
    fireEvent.click(screen.getByText("Logout"));
    await vi.waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    (window.confirm as ReturnType<typeof vi.fn>).mockRestore();
  });

  it("does not call signOutUser when Logout is cancelled", () => {
    const mockSignOut = vi.fn();
    mockUseFirebaseAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test", photoURL: null },
      signOutUser: mockSignOut,
    });
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderHeader();
    fireEvent.click(screen.getByText("Logout"));
    expect(mockSignOut).not.toHaveBeenCalled();
    (window.confirm as ReturnType<typeof vi.fn>).mockRestore();
  });

  it("shows actionable count badge when count > 0", () => {
    mockUseFirebaseAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test", photoURL: null },
      signOutUser: vi.fn(),
    });
    renderHeader(3);
    // Badge is a span with bg-red-500 class next to "Requests"
    const requestsLink = screen.getByText("Requests");
    const badge =
      requestsLink.parentElement?.querySelector(".bg-red-500") ||
      requestsLink.querySelector(".bg-red-500");
    expect(badge).toBeInTheDocument();
  });

  it("does not show badge when actionableCount is 0", () => {
    mockUseFirebaseAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test", photoURL: null },
      signOutUser: vi.fn(),
    });
    renderHeader(0);
    const requestsLink = screen.getByText("Requests");
    const badge =
      requestsLink.parentElement?.querySelector(".bg-red-500") ||
      requestsLink.querySelector(".bg-red-500");
    expect(badge).toBeNull();
  });
});
