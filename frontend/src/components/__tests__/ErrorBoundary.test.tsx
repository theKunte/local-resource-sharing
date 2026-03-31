import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ErrorBoundary from "../ErrorBoundary";

function ThrowingComponent({ error }: { error: Error }): React.ReactNode {
  throw error;
}

describe("ErrorBoundary", () => {
  // Suppress React's console.error for error boundary tests
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <p>Hello World</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("shows error UI when child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error("Test boom")} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test boom")).toBeInTheDocument();
    expect(screen.getByText("Reload Page")).toBeInTheDocument();
  });

  it("shows default message when error has no message", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error("")} />
      </ErrorBoundary>,
    );
    expect(
      screen.getByText("An unexpected error occurred"),
    ).toBeInTheDocument();
  });
});
