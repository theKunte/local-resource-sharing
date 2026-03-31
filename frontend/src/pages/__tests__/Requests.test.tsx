import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../hooks/useFirebaseAuth", () => ({
  useFirebaseAuth: vi.fn(),
}));

vi.mock("../../components/RequestDashboard", () => ({
  default: ({ userId }: { userId: string }) => (
    <div data-testid="request-dashboard">Dashboard for {userId}</div>
  ),
}));

import Requests from "../Requests";
import { useFirebaseAuth } from "../../hooks/useFirebaseAuth";

const mockAuth = useFirebaseAuth as ReturnType<typeof vi.fn>;

describe("Requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders heading", () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" } });
    render(
      <MemoryRouter>
        <Requests />
      </MemoryRouter>,
    );
    expect(screen.getByText("Borrow Requests")).toBeInTheDocument();
  });

  it("shows RequestDashboard when logged in", () => {
    mockAuth.mockReturnValue({ user: { uid: "u1" } });
    render(
      <MemoryRouter>
        <Requests />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("request-dashboard")).toBeInTheDocument();
    expect(screen.getByText("Dashboard for u1")).toBeInTheDocument();
  });

  it("shows sign-in prompt when not logged in", () => {
    mockAuth.mockReturnValue({ user: null });
    render(
      <MemoryRouter>
        <Requests />
      </MemoryRouter>,
    );
    expect(screen.getByText(/sign in to view/i)).toBeInTheDocument();
  });
});
