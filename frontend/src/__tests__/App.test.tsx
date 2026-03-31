import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../hooks/useFirebaseAuth", () => ({
  useFirebaseAuth: vi.fn(),
}));

vi.mock("../hooks/useSessionTimeout", () => ({
  useSessionTimeout: vi.fn(() => ({
    showWarning: false,
    extendSession: vi.fn(),
    logout: vi.fn(),
  })),
}));

vi.mock("../hooks/useNotifications", () => ({
  useNotifications: vi.fn(),
}));

// Mock heavy page components so imports don't fail
vi.mock("../pages/Home", () => ({ default: () => <div>HomeMock</div> }));
vi.mock("../pages/PostResource", () => ({
  default: () => <div>PostMock</div>,
}));
vi.mock("../pages/Profile", () => ({ default: () => <div>ProfileMock</div> }));
vi.mock("../pages/Groups", () => ({ default: () => <div>GroupsMock</div> }));
vi.mock("../pages/GroupDetail", () => ({
  default: () => <div>GroupDetailMock</div>,
}));
vi.mock("../pages/MyGear", () => ({ default: () => <div>MyGearMock</div> }));
vi.mock("../pages/Requests", () => ({
  default: () => <div>RequestsMock</div>,
}));

import App from "../App";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { useSessionTimeout } from "../hooks/useSessionTimeout";

const mockAuth = useFirebaseAuth as ReturnType<typeof vi.fn>;
const mockSession = useSessionTimeout as ReturnType<typeof vi.fn>;

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("shows loading spinner while auth is loading", () => {
    mockAuth.mockReturnValue({ user: null, loading: true });
    render(<App />);
    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });

  it("shows Landing page when not authenticated", () => {
    mockAuth.mockReturnValue({ user: null, loading: false });
    render(<App />);
    expect(screen.getByText(/share outdoor gear/i)).toBeInTheDocument();
  });

  it("shows firebase error screen when firebase_init_error in sessionStorage", () => {
    sessionStorage.setItem("firebase_init_error", "Firebase init failed");
    mockAuth.mockReturnValue({ user: null, loading: false });
    render(<App />);
    expect(screen.getByText("Authentication Error")).toBeInTheDocument();
    expect(screen.getByText("Firebase init failed")).toBeInTheDocument();
  });

  it("shows Refresh Page button on firebase error", () => {
    sessionStorage.setItem("firebase_init_error", "Some error");
    mockAuth.mockReturnValue({ user: null, loading: false });
    render(<App />);
    expect(screen.getByText("Refresh Page")).toBeInTheDocument();
  });

  it("shows session warning when showWarning is true", () => {
    const extendFn = vi.fn();
    const logoutFn = vi.fn();
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test" },
      loading: false,
    });
    mockSession.mockReturnValue({
      showWarning: true,
      extendSession: extendFn,
      logout: logoutFn,
    });

    render(<App />);
    expect(screen.getByText(/session will expire/i)).toBeInTheDocument();
  });

  it("renders Header and BottomNavigation", () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1", displayName: "Test", photoURL: null },
      loading: false,
    });
    render(<App />);
    expect(screen.getByText("GearShare")).toBeInTheDocument();
  });
});
