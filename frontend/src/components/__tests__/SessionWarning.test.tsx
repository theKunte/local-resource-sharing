import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SessionWarning from "../SessionWarning";

describe("SessionWarning", () => {
  it("renders warning text", () => {
    render(<SessionWarning onExtend={vi.fn()} onSignOut={vi.fn()} />);
    expect(screen.getByText("Session Expiring Soon")).toBeInTheDocument();
    expect(screen.getByText(/Your session will expire/)).toBeInTheDocument();
  });

  it("calls onExtend when Extend Session is clicked", () => {
    const onExtend = vi.fn();
    render(<SessionWarning onExtend={onExtend} onSignOut={vi.fn()} />);
    fireEvent.click(screen.getByText("Extend Session"));
    expect(onExtend).toHaveBeenCalledTimes(1);
  });

  it("calls onSignOut when Sign Out is clicked", () => {
    const onSignOut = vi.fn();
    render(<SessionWarning onExtend={vi.fn()} onSignOut={onSignOut} />);
    fireEvent.click(screen.getByText("Sign Out"));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
