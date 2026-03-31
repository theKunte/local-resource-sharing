import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ResourceCard from "../ResourceCard";

describe("ResourceCard", () => {
  const baseProps = {
    id: "r1",
    title: "Test Tent",
    description: "A nice tent",
    image: "data:image/png;base64,abc",
  };

  it("renders title", () => {
    render(
      <MemoryRouter>
        <ResourceCard {...baseProps} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Test Tent")).toBeInTheDocument();
  });

  it("renders image with alt text", () => {
    render(
      <MemoryRouter>
        <ResourceCard {...baseProps} />
      </MemoryRouter>,
    );
    const img = screen.getByAltText("Test Tent");
    expect(img).toBeInTheDocument();
  });

  it("shows Available status by default", () => {
    render(
      <MemoryRouter>
        <ResourceCard {...baseProps} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Available")).toBeInTheDocument();
  });

  it("shows Borrowed badge when status is BORROWED with loan", () => {
    render(
      <MemoryRouter>
        <ResourceCard
          {...baseProps}
          status="BORROWED"
          currentLoan={{
            id: "l1",
            status: "ACTIVE",
            startDate: "2025-01-01",
            endDate: "2025-02-01",
            borrower: { id: "u2", email: "b@test.com" },
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Borrowed")).toBeInTheDocument();
  });

  it("shows action buttons when showActions is true", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <MemoryRouter>
        <ResourceCard
          {...baseProps}
          showActions
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTitle("Edit gear")).toBeInTheDocument();
    expect(screen.getByTitle("Delete gear")).toBeInTheDocument();
  });

  it("shows borrow button when onRequestBorrow provided", () => {
    const onRequestBorrow = vi.fn();

    render(
      <MemoryRouter>
        <ResourceCard {...baseProps} onRequestBorrow={onRequestBorrow} />
      </MemoryRouter>,
    );

    const borrowBtn = screen.getByText(/request to borrow/i);
    expect(borrowBtn).toBeInTheDocument();
  });

  it("calls onRequestBorrow when borrow button clicked", () => {
    const onRequestBorrow = vi.fn();
    render(
      <MemoryRouter>
        <ResourceCard {...baseProps} onRequestBorrow={onRequestBorrow} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText(/request to borrow/i));
    expect(onRequestBorrow).toHaveBeenCalledWith("r1");
  });

  it("disables borrow button when borrowed", () => {
    const onRequestBorrow = vi.fn();
    render(
      <MemoryRouter>
        <ResourceCard
          {...baseProps}
          status="BORROWED"
          currentLoan={{
            id: "l1",
            status: "ACTIVE",
            startDate: "2025-01-01",
            endDate: "2025-02-01",
            borrower: { id: "u2", email: "b@test.com" },
          }}
          onRequestBorrow={onRequestBorrow}
        />
      </MemoryRouter>,
    );
    const btn = screen.getByRole("button", { name: /currently borrowed/i });
    expect(btn).toBeDisabled();
  });

  it("shows return date when borrowed", () => {
    render(
      <MemoryRouter>
        <ResourceCard
          {...baseProps}
          status="BORROWED"
          currentLoan={{
            id: "l1",
            status: "ACTIVE",
            startDate: "2025-01-01",
            endDate: "2025-06-01",
            borrower: { id: "u2", email: "b@test.com" },
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Return by:/)).toBeInTheDocument();
  });

  it("shows Unavailable status when not available", () => {
    render(
      <MemoryRouter>
        <ResourceCard {...baseProps} isAvailable={false} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

  it("truncates long descriptions", () => {
    render(
      <MemoryRouter>
        <ResourceCard {...baseProps} description={"A".repeat(100)} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/A{80}\.\.\./)).toBeInTheDocument();
  });

  it("calls onEdit with resource data", () => {
    const onEdit = vi.fn();
    render(
      <MemoryRouter>
        <ResourceCard {...baseProps} showActions onEdit={onEdit} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTitle("Edit gear"));
    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: "r1", title: "Test Tent" }),
    );
  });

  it("calls onDelete with resource id", () => {
    const onDelete = vi.fn();
    render(
      <MemoryRouter>
        <ResourceCard {...baseProps} showActions onDelete={onDelete} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTitle("Delete gear"));
    expect(onDelete).toHaveBeenCalledWith("r1");
  });

  it("shows manage groups button when onManageGroups provided", () => {
    const onManageGroups = vi.fn();
    render(
      <MemoryRouter>
        <ResourceCard
          {...baseProps}
          showActions
          onManageGroups={onManageGroups}
        />
      </MemoryRouter>,
    );
    expect(screen.getByTitle("Manage groups")).toBeInTheDocument();
  });

  it("calls onManageGroups when clicked", () => {
    const onManageGroups = vi.fn();
    render(
      <MemoryRouter>
        <ResourceCard
          {...baseProps}
          showActions
          onManageGroups={onManageGroups}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTitle("Manage groups"));
    expect(onManageGroups).toHaveBeenCalled();
  });

  it("shows borrowed overlay on image", () => {
    render(
      <MemoryRouter>
        <ResourceCard
          {...baseProps}
          status="BORROWED"
          currentLoan={{
            id: "l1",
            status: "ACTIVE",
            startDate: "2025-01-01",
            endDate: "2025-02-01",
            borrower: { id: "u2", email: "b@test.com" },
          }}
        />
      </MemoryRouter>,
    );
    // Overlay with "Currently Borrowed" text on the image
    const overlayBorrowed = screen.getAllByText("Currently Borrowed");
    expect(overlayBorrowed.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Edit and Delete buttons in showActions mode", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <MemoryRouter>
        <ResourceCard
          {...baseProps}
          showActions
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });
});
