import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FloatingActionButton from "../FloatingActionButton";

describe("FloatingActionButton", () => {
  it("renders a link to /post", () => {
    render(
      <MemoryRouter>
        <FloatingActionButton />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /share gear/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/post");
  });

  it("has proper accessibility label", () => {
    render(
      <MemoryRouter>
        <FloatingActionButton />
      </MemoryRouter>,
    );
    expect(screen.getByText("Share Gear")).toBeInTheDocument();
  });
});
