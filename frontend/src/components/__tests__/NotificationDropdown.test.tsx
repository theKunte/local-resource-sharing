import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../../hooks/useFirebaseAuth", () => ({
  useFirebaseAuth: vi.fn(() => ({ user: { uid: "u1" } })),
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

vi.mock("../NotificationItem", () => ({
  default: ({
    notification,
    onNavigate,
  }: {
    notification: { id: string; title: string };
    onNavigate?: () => void;
  }) => (
    <div data-testid={`item-${notification.id}`}>
      {notification.title}
      <button data-testid={`nav-${notification.id}`} onClick={onNavigate}>
        Navigate
      </button>
    </div>
  ),
}));

import NotificationDropdown from "../NotificationDropdown";
import { useNotifications } from "../../hooks/useNotifications";

const mockUseNotifications = useNotifications as ReturnType<typeof vi.fn>;

function renderDropdown(onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <NotificationDropdown onClose={onClose} />
    </MemoryRouter>,
  );
}

const sampleNotification = {
  id: "n1",
  title: "New Borrow Request",
  read: false,
  type: "borrow_request",
  body: "body",
  priority: "high",
  createdAt: new Date().toISOString(),
  userId: "u1",
};

describe("NotificationDropdown", () => {
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

  it("renders the Notifications header", () => {
    renderDropdown();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("shows empty state when no notifications", () => {
    renderDropdown();
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });

  it("shows loading spinner when isLoading=true", () => {
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
    renderDropdown();
    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });

  it("fetches notifications on mount when list is empty", async () => {
    renderDropdown();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(0, 5));
  });

  it("does not fetch when notifications already exist", async () => {
    mockUseNotifications.mockReturnValue({
      notifications: [sampleNotification],
      isLoading: false,
      fetchNotifications: mockFetch,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      deleteNotification: mockDelete,
      unreadCount: 1,
      fetchUnreadCount: vi.fn(),
    });
    renderDropdown();
    await waitFor(() => expect(mockFetch).not.toHaveBeenCalled());
  });

  it("renders notifications when available", () => {
    mockUseNotifications.mockReturnValue({
      notifications: [sampleNotification],
      isLoading: false,
      fetchNotifications: mockFetch,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      deleteNotification: mockDelete,
      unreadCount: 1,
      fetchUnreadCount: vi.fn(),
    });
    renderDropdown();
    expect(screen.getByTestId("item-n1")).toBeInTheDocument();
  });

  it("shows Mark all as read button when notifications exist", () => {
    mockUseNotifications.mockReturnValue({
      notifications: [sampleNotification],
      isLoading: false,
      fetchNotifications: mockFetch,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      deleteNotification: mockDelete,
      unreadCount: 1,
      fetchUnreadCount: vi.fn(),
    });
    renderDropdown();
    expect(screen.getByText("Mark all as read")).toBeInTheDocument();
  });

  it("calls markAllAsRead when button clicked", async () => {
    mockMarkAllAsRead.mockResolvedValue(undefined);
    mockUseNotifications.mockReturnValue({
      notifications: [sampleNotification],
      isLoading: false,
      fetchNotifications: mockFetch,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      deleteNotification: mockDelete,
      unreadCount: 1,
      fetchUnreadCount: vi.fn(),
    });
    renderDropdown();
    fireEvent.click(screen.getByText("Mark all as read"));
    await waitFor(() => expect(mockMarkAllAsRead).toHaveBeenCalled());
  });

  it("shows View all button and navigates on click", () => {
    const onClose = vi.fn();
    mockUseNotifications.mockReturnValue({
      notifications: [sampleNotification],
      isLoading: false,
      fetchNotifications: mockFetch,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      deleteNotification: mockDelete,
      unreadCount: 1,
      fetchUnreadCount: vi.fn(),
    });
    renderDropdown(onClose);
    fireEvent.click(screen.getByText("View all notifications"));
    expect(mockNavigate).toHaveBeenCalledWith("/notifications");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when notification item navigates", () => {
    const onClose = vi.fn();
    mockUseNotifications.mockReturnValue({
      notifications: [sampleNotification],
      isLoading: false,
      fetchNotifications: mockFetch,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      deleteNotification: mockDelete,
      unreadCount: 1,
      fetchUnreadCount: vi.fn(),
    });
    renderDropdown(onClose);
    fireEvent.click(screen.getByTestId("nav-n1"));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when clicking outside", () => {
    const onClose = vi.fn();
    renderDropdown(onClose);
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalled();
  });
});
