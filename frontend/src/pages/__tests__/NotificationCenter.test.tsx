import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../hooks/useFirebaseAuth", () => ({
  useFirebaseAuth: vi.fn(() => ({ user: { uid: "u1" }, loading: false })),
}));

const mockFetch = vi.fn();
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockDelete = vi.fn();

vi.mock("../../hooks/useNotifications", () => ({
  useNotifications: vi.fn(() => ({
    notifications: [],
    isLoading: false,
    fetchNotifications: mockFetch,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    deleteNotification: mockDelete,
    unreadCount: 0,
    fetchUnreadCount: vi.fn(),
  })),
}));

vi.mock("../../components/NotificationItem", () => ({
  default: ({
    notification,
    onMarkAsRead,
  }: {
    notification: { id: string; title: string };
    onMarkAsRead: (id: string) => void;
  }) => (
    <div data-testid={`notification-${notification.id}`}>
      {notification.title}
      <button onClick={() => onMarkAsRead(notification.id)}>Read</button>
    </div>
  ),
}));

import NotificationCenter from "../NotificationCenter";
import { useNotifications } from "../../hooks/useNotifications";

const mockUseNotifications = useNotifications as ReturnType<typeof vi.fn>;

function renderCenter() {
  return render(
    <MemoryRouter>
      <NotificationCenter />
    </MemoryRouter>,
  );
}

describe("NotificationCenter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotifications.mockReturnValue({
      notifications: [],
      isLoading: false,
      fetchNotifications: mockFetch,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      deleteNotification: mockDelete,
      unreadCount: 0,
      fetchUnreadCount: vi.fn(),
    });
  });

  it("renders heading", () => {
    renderCenter();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("shows empty state for no notifications", () => {
    renderCenter();
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });

  it("shows loading spinner when loading", () => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      isLoading: true,
      fetchNotifications: mockFetch,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      deleteNotification: mockDelete,
      unreadCount: 0,
      fetchUnreadCount: vi.fn(),
    });
    renderCenter();
    expect(screen.getByText("Loading notifications...")).toBeInTheDocument();
  });

  it("renders notifications", () => {
    mockUseNotifications.mockReturnValue({
      notifications: [
        {
          id: "n1",
          title: "Test Notification",
          read: false,
          type: "borrow_request",
          body: "body",
          priority: "high",
          createdAt: new Date().toISOString(),
          userId: "u1",
        },
      ],
      isLoading: false,
      fetchNotifications: mockFetch,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      deleteNotification: mockDelete,
      unreadCount: 1,
      fetchUnreadCount: vi.fn(),
    });
    renderCenter();
    expect(screen.getByTestId("notification-n1")).toBeInTheDocument();
  });

  it("shows Mark all as read when notifications exist", () => {
    mockUseNotifications.mockReturnValue({
      notifications: [
        {
          id: "n1",
          title: "Test",
          read: false,
          type: "borrow_request",
          body: "b",
          priority: "high",
          createdAt: new Date().toISOString(),
          userId: "u1",
        },
      ],
      isLoading: false,
      fetchNotifications: mockFetch,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      deleteNotification: mockDelete,
      unreadCount: 1,
      fetchUnreadCount: vi.fn(),
    });
    renderCenter();
    expect(screen.getByText("Mark all as read")).toBeInTheDocument();
  });

  it("switches to unread filter", () => {
    renderCenter();
    fireEvent.click(screen.getByText("Unread"));
    expect(screen.getByText("No unread notifications")).toBeInTheDocument();
  });

  it("calls fetchNotifications on mount", async () => {
    renderCenter();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(0, 20));
  });

  it("calls markAllAsRead when button clicked", async () => {
    mockUseNotifications.mockReturnValue({
      notifications: [
        {
          id: "n1",
          title: "Test",
          read: false,
          type: "borrow_request",
          body: "b",
          priority: "high",
          createdAt: new Date().toISOString(),
          userId: "u1",
        },
      ],
      isLoading: false,
      fetchNotifications: mockFetch,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      deleteNotification: mockDelete,
      unreadCount: 1,
      fetchUnreadCount: vi.fn(),
    });
    renderCenter();
    fireEvent.click(screen.getByText("Mark all as read"));
    await waitFor(() => expect(mockMarkAllAsRead).toHaveBeenCalled());
  });
});
