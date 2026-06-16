import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import NotificationBell from "../NotificationBell";

vi.mock("../NotificationDropdown", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="notification-dropdown">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

function renderBell(
  props: Partial<React.ComponentProps<typeof NotificationBell>> = {},
) {
  return render(
    <MemoryRouter>
      <NotificationBell unreadCount={0} {...props} />
    </MemoryRouter>,
  );
}

describe("NotificationBell", () => {
  it("renders bell button", () => {
    renderBell();
    expect(
      screen.getByRole("button", { name: /notifications/i }),
    ).toBeInTheDocument();
  });

  it("shows no badge when unreadCount is 0", () => {
    renderBell({ unreadCount: 0 });
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows badge with count when unreadCount > 0", () => {
    renderBell({ unreadCount: 5 });
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows 99+ when unreadCount > 99", () => {
    renderBell({ unreadCount: 100 });
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("applies red color to bell icon when unreadCount > 0", () => {
    renderBell({ unreadCount: 3 });
    const bellIcon = screen.getByTestId("icon-Bell");
    expect(bellIcon.getAttribute("class")).toContain("text-red-500");
  });

  it("opens dropdown when clicked without onNotificationsClick", () => {
    renderBell({ unreadCount: 0 });
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.getByTestId("notification-dropdown")).toBeInTheDocument();
  });

  it("closes dropdown when onClose is called", () => {
    renderBell({ unreadCount: 0 });
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.getByTestId("notification-dropdown")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Close"));
    expect(
      screen.queryByTestId("notification-dropdown"),
    ).not.toBeInTheDocument();
  });

  it("calls onNotificationsClick instead of opening dropdown", () => {
    const onClick = vi.fn();
    renderBell({ onNotificationsClick: onClick });
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(
      screen.queryByTestId("notification-dropdown"),
    ).not.toBeInTheDocument();
  });
});
