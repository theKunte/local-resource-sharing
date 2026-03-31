import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../hooks/useFirebaseAuth", () => ({
  useFirebaseAuth: vi.fn(),
}));

import Login from "../Login";
import { useFirebaseAuth } from "../../hooks/useFirebaseAuth";

const mockAuth = useFirebaseAuth as ReturnType<typeof vi.fn>;

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading spinner when loading", () => {
    mockAuth.mockReturnValue({
      user: null,
      loading: true,
      signInWithGoogle: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders login form when not logged in", () => {
    mockAuth.mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("GearShare").length).toBeGreaterThan(0);
  });

  it("shows Google sign-in button", () => {
    mockAuth.mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText(/continue with google/i)).toBeInTheDocument();
  });

  it("calls signInWithGoogle when Google button clicked", () => {
    const mockSignIn = vi.fn();
    mockAuth.mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle: mockSignIn,
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText(/continue with google/i));
    expect(mockSignIn).toHaveBeenCalled();
  });

  it("renders email and password inputs", () => {
    mockAuth.mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText("Enter your email")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter your password"),
    ).toBeInTheDocument();
  });

  it("toggles password visibility", () => {
    mockAuth.mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    const passwordInput = screen.getByPlaceholderText("Enter your password");
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleBtn = screen.getByLabelText("Show password");
    fireEvent.click(toggleBtn);

    expect(passwordInput).toHaveAttribute("type", "text");
  });

  it("submits form with email and password", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    mockAuth.mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "pass123" },
    });

    const form = document.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining("test@test.com"),
    );
  });

  it("shows Sign In submit button", () => {
    mockAuth.mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("shows Create an account link", () => {
    mockAuth.mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText("Create an account")).toBeInTheDocument();
  });

  it("redirects when user is logged in", () => {
    mockAuth.mockReturnValue({
      user: { uid: "u1" },
      loading: false,
      signInWithGoogle: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    // Should render nothing (redirected)
    expect(screen.queryByText(/continue with google/i)).not.toBeInTheDocument();
  });
});
