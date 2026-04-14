import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  ChevronRight,
  Filter,
  Check,
  X,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
} from "lucide-react";
import apiClient from "../utils/apiClient";

type ApiError = {
  response?: { data?: { message?: string; error?: string } };
};

interface BorrowRequest {
  id: string;
  resourceId: string;
  borrowerId: string;
  ownerId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  message?: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  resource: {
    id: string;
    title: string;
    description: string;
    image?: string;
    status: string;
  };
  borrower: {
    id: string;
    name?: string;
    email: string;
  };
  owner: {
    id: string;
    name?: string;
    email: string;
  };
  group?: {
    id: string;
    name: string;
  };
  loan?: {
    id: string;
    status: "ACTIVE" | "PENDING_RETURN_CONFIRMATION" | "RETURNED" | "OVERDUE";
    startDate: string;
    endDate: string;
    returnedDate?: string;
  };
}

interface RequestDashboardProps {
  userId: string;
}

type StatusFilter = "all" | "pending" | "lending" | "borrowed" | "returned";

const StatusBadge = ({
  status,
  loanStatus,
  isOwner,
  loanEndDate,
}: {
  status: string;
  loanStatus?: string;
  isOwner?: boolean;
  loanEndDate?: string;
}) => {
  let displayText = status;
  let colorClasses = "bg-slate-100 text-slate-700 border-slate-200";

  const isOverdue =
    status === "APPROVED" &&
    (loanStatus === "ACTIVE" || loanStatus === "OVERDUE") &&
    loanEndDate &&
    new Date(loanEndDate) < new Date();

  if (status === "PENDING") {
    displayText = isOwner ? "Pending" : "Awaiting Owner";
    colorClasses = "bg-amber-500/90 text-white border-amber-600";
  } else if (isOverdue) {
    displayText = "Overdue";
    colorClasses = "bg-red-600/90 text-white border-red-700 animate-pulse";
  } else if (status === "APPROVED" && loanStatus === "ACTIVE") {
    displayText = "Borrowed";
    colorClasses = "bg-blue-500/90 text-white border-blue-600";
  } else if (status === "APPROVED" && loanStatus === "RETURNED") {
    displayText = "Returned";
    colorClasses = "bg-sage-600/90 text-white border-sage-700";
  } else if (
    status === "APPROVED" &&
    loanStatus === "PENDING_RETURN_CONFIRMATION"
  ) {
    displayText = "Pending Return";
    colorClasses = "bg-purple-500/90 text-white border-purple-600";
  } else if (status === "REJECTED") {
    displayText = "Rejected";
    colorClasses = "bg-red-500/90 text-white border-red-600";
  } else if (status === "CANCELLED") {
    displayText = "Cancelled";
    colorClasses = "bg-slate-700/90 text-white border-slate-800";
  }

  return (
    <span
      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md shadow-sm ${colorClasses}`}
    >
      {displayText}
    </span>
  );
};

const RequestCard: React.FC<{
  request: BorrowRequest;
  isOwner: boolean;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onCancel: (id: string) => void;
  onEdit: (request: BorrowRequest) => void;
  onDelete: (id: string) => void;
  onMarkReturned: (id: string) => void;
  onInitiateReturn: (loanId: string) => void;
  onConfirmReturn: (loanId: string, requestId: string) => void;
  actionLoading: string | null;
  formatDate: (date: string) => string;
}> = ({
  request,
  isOwner,
  onAccept,
  onDecline,
  onCancel,
  onEdit,
  onDelete,
  onMarkReturned,
  onInitiateReturn,
  onConfirmReturn,
  actionLoading,
  formatDate,
}) => {
  const isPending = request.status === "PENDING";
  const isApproved = request.status === "APPROVED";
  const isActive =
    isApproved &&
    (request.loan?.status === "ACTIVE" || request.loan?.status === "OVERDUE");
  const isPendingReturn =
    isApproved && request.loan?.status === "PENDING_RETURN_CONFIRMATION";
  const isReturned = isApproved && request.loan?.status === "RETURNED";
  const isOverdue =
    isActive &&
    request.loan?.endDate &&
    new Date(request.loan.endDate) < new Date();

  const getOverdueDays = () => {
    if (!isOverdue || !request.loan?.endDate) return 0;
    const diffMs =
      new Date().getTime() - new Date(request.loan.endDate).getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const getStatusMessage = () => {
    if (isPending) {
      return isOwner
        ? "Waiting for your approval"
        : `Waiting for ${request.owner.name || "the owner"} to respond`;
    }
    if (isOverdue) {
      const days = getOverdueDays();
      return `Overdue by ${days} day${days !== 1 ? "s" : ""} — please return or contact the ${isOwner ? "borrower" : "owner"}`;
    }
    if (isActive) return "Currently in use";
    if (isPendingReturn) return "Awaiting return confirmation";
    if (isReturned) return "Item successfully returned";
    if (request.status === "REJECTED") return "Request was declined";
    if (request.status === "CANCELLED") return "Request was cancelled";
    return "";
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white/80 backdrop-blur-sm rounded-[2rem] shadow-sm mb-4 border border-white/20 overflow-visible relative"
    >
      <div className="p-6">
        <div className="flex gap-4">
          {request.resource.image && (
            <div className="w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100 relative">
              <img
                src={request.resource.image}
                alt={request.resource.title}
                className="w-full h-full object-cover"
              />
              {/* Status badge floating on image */}
              <div className="absolute top-2 left-2">
                <StatusBadge
                  status={request.status}
                  loanStatus={request.loan?.status}
                  isOwner={isOwner}
                  loanEndDate={request.loan?.endDate}
                />
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold text-slate-900 line-clamp-1 flex-1 pr-2">
                {request.resource.title}
              </h3>
              {/* Date badge on the right */}
              <div className="flex items-center gap-1.5 text-slate-400 text-xs flex-shrink-0 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                <Clock size={14} />
                <span className="whitespace-nowrap">
                  {formatDate(request.createdAt)}
                </span>
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-4 line-clamp-2">
              {request.resource.description}
            </p>

            <div className="space-y-2">
              <div className="flex text-[11px] uppercase tracking-wider font-semibold">
                <span className="text-slate-400 w-20 flex-shrink-0">
                  {isOwner ? "Borrower" : "Owner"}
                </span>
                <span className="text-slate-700 truncate">
                  {isOwner
                    ? request.borrower.name || request.borrower.email
                    : request.owner.name || request.owner.email}
                </span>
              </div>
              {request.group && (
                <div className="flex text-[11px] uppercase tracking-wider font-semibold">
                  <span className="text-slate-400 w-20 flex-shrink-0">
                    Group
                  </span>
                  <span className="text-slate-700 truncate">
                    {request.group.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-50">
          <div className="flex flex-col gap-1 mb-3">
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
              Borrow Period
            </span>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <span>{formatDate(request.startDate)}</span>
              <ChevronRight size={14} className="text-slate-300" />
              <span>{formatDate(request.endDate)}</span>
            </div>
          </div>

          {request.message && (
            <div className="mb-3">
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block mb-1">
                Message
              </span>
              <p className="text-xs text-slate-600 italic">{request.message}</p>
            </div>
          )}

          <p className="text-xs text-slate-400 italic mb-4">
            {getStatusMessage()}
          </p>

          {/* Pending info banner for borrower */}
          {!isOwner && isPending && (
            <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2 text-xs">
              <Clock size={14} className="flex-shrink-0" />
              <span>
                Your request has been sent. The owner will review and accept or
                decline it.
              </span>
            </div>
          )}

          {/* Overdue warning banner */}
          {isOverdue && (
            <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 rounded-xl px-3 py-2 text-xs">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>
                This item is overdue by{" "}
                <strong>
                  {getOverdueDays()} day{getOverdueDays() !== 1 ? "s" : ""}
                </strong>
                .
                {isOwner
                  ? " Please follow up with the borrower."
                  : " Please return the item as soon as possible."}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            {isOwner && isPending && (
              <>
                <button
                  onClick={() => onAccept(request.id)}
                  disabled={actionLoading === request.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700 disabled:opacity-50 transition-colors"
                >
                  <Check size={16} />
                  {actionLoading === request.id ? "Accepting..." : "Accept"}
                </button>
                <button
                  onClick={() => onDecline(request.id)}
                  disabled={actionLoading === request.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-200 disabled:opacity-50 transition-colors"
                >
                  <X size={16} />
                  Decline
                </button>
              </>
            )}

            {!isOwner && isPending && (
              <>
                <button
                  onClick={() => onEdit(request)}
                  disabled={actionLoading === request.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-200 disabled:opacity-50 transition-colors"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  onClick={() => onCancel(request.id)}
                  disabled={actionLoading === request.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  <X size={16} />
                  Cancel
                </button>
              </>
            )}

            {isOwner && isActive && (
              <button
                onClick={() => onMarkReturned(request.id)}
                disabled={actionLoading === request.id}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700 disabled:opacity-50 transition-colors"
              >
                <Package size={16} />
                {actionLoading === request.id
                  ? "Processing..."
                  : "Mark as Returned"}
              </button>
            )}

            {!isOwner && isActive && request.loan && (
              <button
                onClick={() => onInitiateReturn(request.loan!.id)}
                disabled={actionLoading === request.loan.id}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl text-sm font-semibold hover:bg-purple-200 disabled:opacity-50 transition-colors"
              >
                <Package size={16} />
                {actionLoading === request.loan.id
                  ? "Processing..."
                  : "I Returned This"}
              </button>
            )}

            {isOwner && isPendingReturn && request.loan && (
              <button
                onClick={() => onConfirmReturn(request.loan!.id, request.id)}
                disabled={actionLoading === request.id}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700 disabled:opacity-50 transition-colors"
              >
                <Check size={16} />
                {actionLoading === request.id
                  ? "Confirming..."
                  : "Confirm Return"}
              </button>
            )}

            {!isOwner &&
              (request.status === "REJECTED" ||
                request.status === "CANCELLED") && (
                <button
                  onClick={() => onDelete(request.id)}
                  disabled={actionLoading === request.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-200 disabled:opacity-50 transition-colors"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const RequestDashboard: React.FC<RequestDashboardProps> = ({ userId }) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [allRequests, setAllRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState<BorrowRequest | null>(
    null,
  );
  const [editForm, setEditForm] = useState({
    startDate: "",
    endDate: "",
    message: "",
  });

  // Advanced deduplication and caching
  const loadingRef = React.useRef(false);
  const cacheRef = React.useRef<{
    data: BorrowRequest[];
    timestamp: number;
  } | null>(null);
  const pendingRequestRef = React.useRef<Promise<void> | null>(null);
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const CACHE_TTL = 10000; // 10 seconds cache

  const loadRequests = React.useCallback(
    async (forceRefresh = false) => {
      if (!userId) {
        console.error("RequestDashboard: userId is required");
        return;
      }

      // Return cached data if still valid and not forcing refresh
      if (!forceRefresh && cacheRef.current) {
        const age = Date.now() - cacheRef.current.timestamp;
        if (age < CACHE_TTL) {
          console.log("[Cache] Using cached data");
          setAllRequests(cacheRef.current.data);
          return;
        }
      }

      // If already loading, return the pending promise
      if (pendingRequestRef.current) {
        console.log("[Dedup] Reusing pending request");
        return pendingRequestRef.current;
      }

      // Prevent duplicate calls
      if (loadingRef.current) {
        console.log("[RequestDashboard] Skipping duplicate request");
        return;
      }

      loadingRef.current = true;
      setLoading(true);
      setError(null);

      const requestPromise = (async () => {
        try {
          // Add cache-busting parameter when forcing refresh to bypass apiClient deduplication
          const cacheBuster = forceRefresh ? `&_t=${Date.now()}` : "";

          // Load all requests (both incoming and outgoing)
          const [incomingResponse, outgoingResponse] = await Promise.all([
            apiClient.get(
              `/api/borrow-requests?userId=${userId}&role=owner${cacheBuster}`,
            ),
            apiClient.get(
              `/api/borrow-requests?userId=${userId}&role=borrower${cacheBuster}`,
            ),
          ]);

          const incomingData =
            incomingResponse.data.requests || incomingResponse.data;
          const outgoingData =
            outgoingResponse.data.requests || outgoingResponse.data;

          const incoming = Array.isArray(incomingData) ? incomingData : [];
          const outgoing = Array.isArray(outgoingData) ? outgoingData : [];

          const combinedData = [...incoming, ...outgoing].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );

          // Update cache
          cacheRef.current = {
            data: combinedData,
            timestamp: Date.now(),
          };

          setAllRequests(combinedData);
        } catch (error) {
          console.error("Error loading requests:", error);
          setError("Failed to load requests. Please try again.");
        } finally {
          setLoading(false);
          loadingRef.current = false;
          pendingRequestRef.current = null;
        }
      })();

      pendingRequestRef.current = requestPromise;
      return requestPromise;
    },
    [userId],
  );

  useEffect(() => {
    if (userId) {
      loadRequests();
    }

    // Cleanup debounce timer
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const timer = debounceTimerRef.current;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [userId, loadRequests]);

  const handleAccept = async (requestId: string) => {
    setActionLoading(requestId);

    try {
      const response = await apiClient.post(
        `/api/borrow-requests/${requestId}/accept`,
        {
          userId,
        },
      );

      // Clear cache and force immediate refresh to get accurate state
      cacheRef.current = null;
      await loadRequests(true);

      // Emit resource update event so other components (like Home) can refresh
      if (response.data?.borrowRequest?.resource) {
        try {
          window.dispatchEvent(
            new CustomEvent("resource:updated", {
              detail: { resource: response.data.borrowRequest.resource },
            }),
          );
        } catch (e) {
          console.debug("Failed to dispatch resource:updated event", e);
        }
      }

      alert("Request accepted successfully!");
    } catch (error) {
      console.error("Error accepting request:", error);
      // Clear cache and reload on error to get correct state
      cacheRef.current = null;
      await loadRequests(true);
      const errorMessage =
        (error as ApiError).response?.data?.message ||
        (error as ApiError).response?.data?.error ||
        "Failed to accept request";
      alert(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    if (!confirm("Are you sure you want to decline this request?")) return;

    setActionLoading(requestId);

    try {
      await apiClient.post(`/api/borrow-requests/${requestId}/decline`, {
        userId,
      });
      cacheRef.current = null;
      await loadRequests(true);
      alert("Request declined");
    } catch (error) {
      console.error("Error declining request:", error);
      cacheRef.current = null;
      await loadRequests(true);
      alert(
        (error as ApiError).response?.data?.error ||
          "Failed to decline request",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!confirm("Are you sure you want to cancel this request?")) return;

    setActionLoading(requestId);

    try {
      await apiClient.post(`/api/borrow-requests/${requestId}/cancel`, {
        userId,
      });
      cacheRef.current = null;
      await loadRequests(true);
      alert("Request cancelled");
    } catch (error) {
      console.error("Error cancelling request:", error);
      cacheRef.current = null;
      await loadRequests(true);
      alert(
        (error as ApiError).response?.data?.error || "Failed to cancel request",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (request: BorrowRequest) => {
    setEditingRequest(request);
    setEditForm({
      startDate: request.startDate.split("T")[0],
      endDate: request.endDate.split("T")[0],
      message: request.message || "",
    });
  };

  const handleUpdateRequest = async () => {
    if (!editingRequest) return;

    setActionLoading(editingRequest.id);

    try {
      await apiClient.put(`/api/borrow-requests/${editingRequest.id}`, {
        userId,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        message: editForm.message,
      });
      cacheRef.current = null;
      await loadRequests(true);
      setEditingRequest(null);
      alert("Request updated successfully!");
    } catch (error) {
      console.error("Error updating request:", error);
      cacheRef.current = null;
      await loadRequests(true);
      alert(
        (error as ApiError).response?.data?.error || "Failed to update request",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (requestId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this request? This action cannot be undone.",
      )
    )
      return;

    setActionLoading(requestId);

    try {
      await apiClient.delete(`/api/borrow-requests/${requestId}`, {
        data: { userId },
      });
      // Clear cache and reload to refresh list
      cacheRef.current = null;
      await loadRequests(true);
      alert("Request deleted");
    } catch (error) {
      console.error("Error deleting request:", error);
      cacheRef.current = null;
      await loadRequests(true);
      alert(
        (error as ApiError).response?.data?.error || "Failed to delete request",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkReturned = async (requestId: string) => {
    if (
      !confirm(
        "Mark this item as returned? This will make the item available again and notify the borrower.",
      )
    )
      return;

    setActionLoading(requestId);

    try {
      await apiClient.post(`/api/borrow-requests/${requestId}/mark-returned`, {
        userId,
      });
      // Clear cache and force immediate refresh to ensure UI is in sync
      cacheRef.current = null;
      await loadRequests(true);

      // Emit event to notify other components that resource is now available again
      // Find the updated request to get resource data
      const updatedRequest = allRequests.find((r) => r.id === requestId);
      if (updatedRequest?.resource) {
        try {
          window.dispatchEvent(
            new CustomEvent("resource:updated", {
              detail: { resource: updatedRequest.resource },
            }),
          );
        } catch (e) {
          console.debug("Failed to dispatch resource:updated event", e);
        }
      }

      alert(
        "Item marked as returned successfully! The item is now available in your groups.",
      );
    } catch (error) {
      console.error("Error marking as returned:", error);
      // Clear cache and reload to get actual state
      cacheRef.current = null;
      await loadRequests(true);
      const errorMessage =
        (error as ApiError).response?.data?.message ||
        (error as ApiError).response?.data?.error ||
        "Failed to mark as returned";
      alert(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleInitiateReturn = async (loanId: string) => {
    if (
      !confirm(
        "Have you returned this item? The owner will need to confirm receipt before the item becomes available again.",
      )
    )
      return;

    setActionLoading(loanId);

    try {
      await apiClient.post(`/api/loans/${loanId}/request-return`, { userId });
      cacheRef.current = null;
      await loadRequests(true);
      alert(
        "Return initiated! The owner will be notified to confirm they received the item back.",
      );
    } catch (error) {
      console.error("Error initiating return:", error);
      cacheRef.current = null;
      await loadRequests(true);
      alert(
        (error as ApiError).response?.data?.message ||
          (error as ApiError).response?.data?.error ||
          "Failed to initiate return",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReturn = async (loanId: string, requestId: string) => {
    if (
      !confirm(
        "Confirm that you received the item back? This will make it available again.",
      )
    )
      return;

    setActionLoading(requestId);

    try {
      await apiClient.post(`/api/loans/${loanId}/confirm-return`, { userId });
      // Clear cache and force immediate refresh to ensure UI is in sync
      cacheRef.current = null;
      await loadRequests(true);

      // Emit event to notify other components that resource is now available again
      // Find the request with this loan to get resource data
      const updatedRequest = allRequests.find((r) => r.loan?.id === loanId);
      if (updatedRequest?.resource) {
        try {
          window.dispatchEvent(
            new CustomEvent("resource:updated", {
              detail: { resource: updatedRequest.resource },
            }),
          );
        } catch (e) {
          console.debug("Failed to dispatch resource:updated event", e);
        }
      }

      alert(
        "Return confirmed! The item is now available in your groups again.",
      );
    } catch (error) {
      console.error("Error confirming return:", error);
      cacheRef.current = null;
      await loadRequests(true);
      alert(
        (error as ApiError).response?.data?.message ||
          (error as ApiError).response?.data?.error ||
          "Failed to confirm return",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filterRequests = (requests: BorrowRequest[]) => {
    if (statusFilter === "all") return requests;

    if (statusFilter === "pending") {
      return requests.filter(
        (req) =>
          req.status === "PENDING" ||
          (req.status === "APPROVED" &&
            req.loan?.status === "PENDING_RETURN_CONFIRMATION"),
      );
    }

    if (statusFilter === "lending") {
      return requests.filter(
        (req) =>
          req.ownerId === userId &&
          req.status === "APPROVED" &&
          req.loan?.status === "ACTIVE",
      );
    }

    if (statusFilter === "borrowed") {
      return requests.filter(
        (req) =>
          req.borrowerId === userId &&
          req.status === "APPROVED" &&
          req.loan?.status === "ACTIVE",
      );
    }

    if (statusFilter === "returned") {
      return requests.filter(
        (req) => req.status === "APPROVED" && req.loan?.status === "RETURNED",
      );
    }

    return requests;
  };

  const filteredRequests = filterRequests(allRequests);

  // Calculate counts for each status (includes return confirmations needing action)
  const pendingCount = allRequests.filter(
    (req) =>
      req.status === "PENDING" ||
      (req.status === "APPROVED" &&
        req.loan?.status === "PENDING_RETURN_CONFIRMATION"),
  ).length;
  const lendingCount = allRequests.filter(
    (req) =>
      req.ownerId === userId &&
      req.status === "APPROVED" &&
      req.loan?.status === "ACTIVE",
  ).length;
  const borrowedCount = allRequests.filter(
    (req) =>
      req.borrowerId === userId &&
      req.status === "APPROVED" &&
      req.loan?.status === "ACTIVE",
  ).length;
  const returnedCount = allRequests.filter(
    (req) => req.status === "APPROVED" && req.loan?.status === "RETURNED",
  ).length;
  const statusFilterTabs: {
    value: StatusFilter;
    label: string;
    count: number;
  }[] = [
    { value: "all", label: "All", count: allRequests.length },
    { value: "pending", label: "Pending", count: pendingCount },
    { value: "lending", label: "Lending", count: lendingCount },
    { value: "borrowed", label: "Borrowed", count: borrowedCount },
    { value: "returned", label: "Returned", count: returnedCount },
  ];

  if (loading && allRequests.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Status Filter Tabs */}
      <div className="mb-6">
        <div className="bg-white/40 backdrop-blur-sm p-1 rounded-2xl flex gap-1 border border-white/60">
          {statusFilterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`relative flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                statusFilter === tab.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label} ({tab.count})
              {tab.value === "pending" && tab.count > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Requests List */}
      <AnimatePresence mode="popLayout">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              isOwner={request.ownerId === userId}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onCancel={handleCancel}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMarkReturned={handleMarkReturned}
              onInitiateReturn={handleInitiateReturn}
              onConfirmReturn={handleConfirmReturn}
              actionLoading={actionLoading}
              formatDate={formatDate}
            />
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white/60 backdrop-blur-sm rounded-[2rem] border border-white/20"
          >
            <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
              <Filter size={24} className="text-sage-600" />
            </div>
            <p className="font-medium text-lg">No {statusFilter} requests</p>
            <p className="text-sm mt-1">No requests found</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setEditingRequest(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                Edit Request
              </h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, startDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, endDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    value={editForm.message}
                    onChange={(e) =>
                      setEditForm({ ...editForm, message: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
                    placeholder="Add a note to the owner..."
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUpdateRequest}
                  disabled={actionLoading === editingRequest.id}
                  className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-semibold hover:bg-cyan-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading === editingRequest.id
                    ? "Saving..."
                    : "Save Changes"}
                </button>
                <button
                  onClick={() => setEditingRequest(null)}
                  className="flex-1 py-3 bg-gray-100 text-slate-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RequestDashboard;
