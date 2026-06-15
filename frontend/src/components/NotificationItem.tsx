import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Package, Clock, X } from "lucide-react";
import type { Notification } from "../hooks/useNotifications";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  compact = false,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  const getIcon = () => {
    switch (notification.type) {
      case "borrow_request":
        return <Package className="w-5 h-5 text-blue-500" />;
      case "request_accepted":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "request_declined":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "return_requested":
        return <Clock className="w-5 h-5 text-orange-500" />;
      case "return_confirmed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Package className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-3 p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
        !notification.read ? "bg-blue-50" : ""
      }`}
    >
      <div className="flex-shrink-0 mt-1">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p
              className={`text-sm ${!notification.read ? "font-semibold" : "font-normal"}`}
            >
              {notification.title}
            </p>
            {!compact && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {notification.body}
              </p>
            )}
          </div>
          {!notification.read && (
            <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {getTimeAgo(notification.createdAt)}
        </p>
      </div>
      <button
        onClick={handleDelete}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
        aria-label="Delete notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default NotificationItem;
