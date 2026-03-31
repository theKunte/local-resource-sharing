import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

// Mock useFirebaseAuth
vi.mock("../../hooks/useFirebaseAuth", () => ({
  useFirebaseAuth: vi.fn(() => ({
    signInWithGoogle: vi.fn(),
  })),
}));

import Landing from "../Landing";

function renderLanding() {
  return render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  );
}

describe("Landing", () => {
  it("renders the hero title", () => {
    renderLanding();
    expect(screen.getByText("GearShare")).toBeInTheDocument();
  });

  it("renders the sign-in button", () => {
    renderLanding();
    expect(
      screen.getByText(/Start Sharing Gear.*Sign in with Google/),
    ).toBeInTheDocument();
  });

  it("shows feature cards", () => {
    renderLanding();
    expect(screen.getByText("Share Camping Gear")).toBeInTheDocument();
    expect(screen.getByText(/Hiking.*Climbing/)).toBeInTheDocument();
    expect(screen.getByText("Adventure Ready")).toBeInTheDocument();
  });

  it("shows how it works section", () => {
    renderLanding();
    expect(screen.getByText("How It Works")).toBeInTheDocument();
    expect(screen.getByText(/Join.*Connect/)).toBeInTheDocument();
    expect(screen.getByText("Share Your Gear")).toBeInTheDocument();
    expect(screen.getByText(/Borrow.*Adventure/)).toBeInTheDocument();
  });
});
