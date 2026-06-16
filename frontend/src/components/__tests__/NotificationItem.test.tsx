import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import NotificationItem from "../NotificationItem";
import type { Notification } from "../../hooks/useNotifications";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const base: Notification = {
  id: "n1",
  userId: "u1",
  type: "borrow_request",
  title: "New Borrow Request",
  body: "Someone wants your tent",
  read: false,
  actionUrl: "/requests/abc",
  priority: "high",
  createdAt: new Date().toISOString(),
};

function renderItem(
  overrides: Partial<Notification> = {},
  props: { compact?: boolean; onNavigate?: () => void } = {},
) {
  const notification = { ...base, ...overrides };
  const onMarkAsRead = vi.fn();
  const onDelete = vi.fn();
  mockNavigate.mockReset();
  const result = render(
    <MemoryRouter>
      <NotificationItem
        notification={notification}
        onMarkAsRead={onMarkAsRead}
        onDelete={onDelete}
        {...props}
      />
    </MemoryRouter>,
  );
  return { onMarkAsRead, onDelete, ...result };
}

describe("NotificationItem", () => {
  it("renders title", () => {
    renderItem();
    expect(screen.getByText("New Borrow Request")).toBeInTheDocument();
  });

  it("shows body when not compact", () => {
    renderItem();
    expect(screen.getByText("Someone wants your tent")).toBeInTheDocument();
  });

  it("hides body when compact", () => {
    renderItem({}, { compact: true });
    expect(
      screen.queryByText("Someone wants your tent"),
    ).not.toBeInTheDocument();
  });

  it("applies unread highlight", () => {
    renderItem({ read: false });
    const item = document.querySelector(".bg-blue-50");
    expect(item).toBeTruthy();
  });

  it("no highlight when read", () => {
    renderItem({ read: true });
    const item = document.querySelector(".bg-blue-50");
    expect(item).toBeFalsy();
  });

  it("calls onMarkAsRead and navigates on click when unread", () => {
    const { onMarkAsRead } = renderItem({ read: false });
    fireEvent.click(screen.getByText("New Borrow Request"));
    expect(onMarkAsRead).toHaveBeenCalledWith("n1");
    expect(mockNavigate).toHaveBeenCalledWith("/requests/abc");
  });

  it("does not call onMarkAsRead when already read", () => {
    const { onMarkAsRead } = renderItem({ read: true });
    fireEvent.click(screen.getByText("New Borrow Request"));
    expect(onMarkAsRead).not.toHaveBeenCalled();
  });

  it("calls onNavigate callback after navigation", () => {
    const onNavigate = vi.fn();
    renderItem({ read: false }, { onNavigate });
    fireEvent.click(screen.getByText("New Borrow Request"));
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("does not navigate when no actionUrl", () => {
    renderItem({ actionUrl: undefined });
    fireEvent.click(screen.getByText("New Borrow Request"));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("calls onDelete when delete button clicked", () => {
    const { onDelete } = renderItem();
    fireEvent.click(
      screen.getByRole("button", { name: /delete notification/i }),
    );
    expect(onDelete).toHaveBeenCalledWith("n1");
  });

  it.each([
    ["borrow_request", "icon-Package"],
    ["request_accepted", "icon-CheckCircle"],
    ["request_declined", "icon-XCircle"],
    ["return_requested", "icon-Clock"],
    ["return_confirmed", "icon-CheckCircle"],
    ["unknown_type", "icon-Package"],
  ])("shows correct icon for type %s", (type, iconTestId) => {
    renderItem({ type });
    expect(screen.getByTestId(iconTestId)).toBeInTheDocument();
  });
});
