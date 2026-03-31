import { render, screen } from "@testing-library/react";
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
    </MemoryRouter>
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
});
