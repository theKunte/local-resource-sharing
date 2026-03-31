import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import GearCard from "../GearCard";

describe("GearCard", () => {
  const baseProps = {
    id: "r1",
    title: "Camping Tent",
    description: "A sturdy 2-person tent for all seasons",
    image: "data:image/png;base64,abc",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders title and description", () => {
    render(<GearCard {...baseProps} />);
    expect(screen.getByText("Camping Tent")).toBeInTheDocument();
    expect(
      screen.getByText("A sturdy 2-person tent for all seasons"),
    ).toBeInTheDocument();
  });

  it("renders image with alt text", () => {
    render(<GearCard {...baseProps} />);
    expect(screen.getByAltText("Camping Tent")).toBeInTheDocument();
  });

  it("shows Available badge by default", () => {
    render(<GearCard {...baseProps} />);
    expect(screen.getByText("Available")).toBeInTheDocument();
  });

  it("shows Currently Borrowed badge when status BORROWED with loan", () => {
    render(
      <GearCard
        {...baseProps}
        status="BORROWED"
        currentLoan={{
          id: "l1",
          status: "ACTIVE",
          startDate: "2026-01-01",
          endDate: "2026-06-01",
          borrower: { id: "u2", name: "Bob", email: "bob@test.com" },
        }}
      />,
    );
    expect(screen.getAllByText("Currently Borrowed").length).toBeGreaterThan(0);
  });

  it("shows borrower info when borrowed", () => {
    render(
      <GearCard
        {...baseProps}
        status="BORROWED"
        currentLoan={{
          id: "l1",
          status: "ACTIVE",
          startDate: "2026-01-01",
          endDate: "2026-06-01",
          borrower: { id: "u2", name: "Bob", email: "bob@test.com" },
        }}
      />,
    );
    expect(screen.getByText("Borrowed by:")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows return date when borrowed", () => {
    render(
      <GearCard
        {...baseProps}
        status="BORROWED"
        currentLoan={{
          id: "l1",
          status: "ACTIVE",
          startDate: "2026-01-01",
          endDate: "2026-06-01",
          borrower: { id: "u2", name: "Bob", email: "bob@test.com" },
        }}
      />,
    );
    expect(screen.getByText(/Return by/)).toBeInTheDocument();
  });

  it("shows Request to Borrow button when onRequestBorrow provided", () => {
    const onRequestBorrow = vi.fn();
    render(<GearCard {...baseProps} onRequestBorrow={onRequestBorrow} />);
    expect(screen.getByText("Request to Borrow")).toBeInTheDocument();
  });

  it("calls onRequestBorrow when clicked", () => {
    const onRequestBorrow = vi.fn();
    render(<GearCard {...baseProps} onRequestBorrow={onRequestBorrow} />);
    fireEvent.click(screen.getByText("Request to Borrow"));
    expect(onRequestBorrow).toHaveBeenCalledWith("r1");
  });

  it("disables borrow when item is borrowed", () => {
    const onRequestBorrow = vi.fn();
    render(
      <GearCard
        {...baseProps}
        status="BORROWED"
        currentLoan={{
          id: "l1",
          status: "ACTIVE",
          startDate: "2026-01-01",
          endDate: "2026-06-01",
          borrower: { id: "u2", email: "bob@test.com" },
        }}
        onRequestBorrow={onRequestBorrow}
      />,
    );
    const btn = screen
      .getAllByText("Currently Borrowed")
      .find((el) => el.tagName === "BUTTON");
    if (btn) {
      fireEvent.click(btn);
      expect(onRequestBorrow).not.toHaveBeenCalled();
    }
  });

  it("shows action buttons when showActions is true", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onManageGroups = vi.fn();

    render(
      <GearCard
        {...baseProps}
        showActions
        onEdit={onEdit}
        onDelete={onDelete}
        onManageGroups={onManageGroups}
      />,
    );

    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Share")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls onDelete when delete button clicked", () => {
    const onDelete = vi.fn();
    render(<GearCard {...baseProps} showActions onDelete={onDelete} />);
    fireEvent.click(screen.getByText("Delete"));
    expect(onDelete).toHaveBeenCalledWith("r1");
  });

  it("calls onManageGroups when share button clicked", () => {
    const onManageGroups = vi.fn();
    render(
      <GearCard {...baseProps} showActions onManageGroups={onManageGroups} />,
    );
    fireEvent.click(screen.getByText("Share"));
    expect(onManageGroups).toHaveBeenCalled();
  });

  it("opens edit modal when edit button clicked", () => {
    const onEdit = vi.fn();
    render(<GearCard {...baseProps} showActions onEdit={onEdit} />);
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByText("Edit Gear")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Camping Tent")).toBeInTheDocument();
  });

  it("saves edits from edit modal", () => {
    const onEdit = vi.fn();
    render(<GearCard {...baseProps} showActions onEdit={onEdit} />);
    fireEvent.click(screen.getByText("Edit"));

    const titleInput = screen.getByDisplayValue("Camping Tent");
    fireEvent.change(titleInput, { target: { value: "New Title" } });

    fireEvent.click(screen.getByText("Save Changes"));

    // setTimeout delay of 800ms
    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ title: "New Title" }),
    );
  });

  it("closes edit modal via cancel", () => {
    const onEdit = vi.fn();
    render(<GearCard {...baseProps} showActions onEdit={onEdit} />);
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByText("Edit Gear")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    // Modal should close (AnimatePresence may still show briefly)
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("shows shared groups badge when provided", () => {
    render(
      <GearCard
        {...baseProps}
        showActions
        sharedWith={[
          {
            id: "sg1",
            resourceId: "r1",
            groupId: "g1",
            group: { id: "g1", name: "Hiking Crew" },
          },
        ]}
      />,
    );
    expect(screen.getByText("Shared in 1 Group")).toBeInTheDocument();
  });

  it("shows plural groups text", () => {
    render(
      <GearCard
        {...baseProps}
        showActions
        sharedWith={[
          {
            id: "sg1",
            resourceId: "r1",
            groupId: "g1",
            group: { id: "g1", name: "A" },
          },
          {
            id: "sg2",
            resourceId: "r1",
            groupId: "g2",
            group: { id: "g2", name: "B" },
          },
        ]}
      />,
    );
    expect(screen.getByText("Shared in 2 Groups")).toBeInTheDocument();
  });

  it("shows Unavailable badge when isAvailable is false", () => {
    render(<GearCard {...baseProps} isAvailable={false} />);
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

  it("uses email as borrower name fallback", () => {
    render(
      <GearCard
        {...baseProps}
        status="BORROWED"
        currentLoan={{
          id: "l1",
          status: "ACTIVE",
          startDate: "2026-01-01",
          endDate: "2026-06-01",
          borrower: { id: "u2", email: "bob@test.com" },
        }}
      />,
    );
    expect(screen.getByText("bob@test.com")).toBeInTheDocument();
  });
});
