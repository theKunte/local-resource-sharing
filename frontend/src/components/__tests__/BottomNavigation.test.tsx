import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../hooks/useFirebaseAuth", () => ({
  useFirebaseAuth: vi.fn(),
}));

vi.mock("../../hooks/useActionableCount", () => ({
  useActionableCount: vi.fn(() => 0),
}));

import BottomNavigation from "../BottomNavigation";
import { useFirebaseAuth } from "../../hooks/useFirebaseAuth";
import { useActionableCount } from "../../hooks/useActionableCount";

const mockUseFirebaseAuth = useFirebaseAuth as ReturnType<typeof vi.fn>;
const mockUseActionableCount = useActionableCount as ReturnType<typeof vi.fn>;

function renderNav(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNavigation />
    </MemoryRouter>,
  );
}

describe("BottomNavigation", () => {
  it("does not render when user is not logged in", () => {
    mockUseFirebaseAuth.mockReturnValue({ user: null });
    const { container } = renderNav();
    expect(container.querySelector("nav")).toBeNull();
  });

  it("renders nav items when user is logged in", () => {
    mockUseFirebaseAuth.mockReturnValue({
      user: { uid: "u1" },
    });
    renderNav();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Groups")).toBeInTheDocument();
    expect(screen.getByText("Add")).toBeInTheDocument();
    expect(screen.getByText("My Gear")).toBeInTheDocument();
    expect(screen.getByText("Requests")).toBeInTheDocument();
  });

  it("shows badge when actionableCount > 0", () => {
    mockUseFirebaseAuth.mockReturnValue({
      user: { uid: "u1" },
    });
    mockUseActionableCount.mockReturnValue(3);
    const { container } = renderNav();
    expect(container.querySelector(".bg-red-500")).toBeTruthy();
  });
});
