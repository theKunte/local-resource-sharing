import React, { useState, useEffect } from "react";
import apiClient from "../utils/apiClient";

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
    status: "ACTIVE" | "PENDING_RETURN_CONFIRMATION" | "RETURNED";
    startDate: string;
    endDate: string;
    returnedDate?: string;
  };
}

interface RequestDashboardProps {
  userId: string;
}

const RequestDashboard: React.FC<RequestDashboardProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">(
    "incoming"
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "completed"
  >("all");
  const [incomingRequests, setIncomingRequests] = useState<BorrowRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState<BorrowRequest | null>(
    null
  );
  const [editForm, setEditForm] = useState({
    startDate: "",
    endDate: "",
    message: "",
  });

  const loadRequests = async () => {
    if (!userId) {
      console.error("RequestDashboard: userId is required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Load incoming requests (as owner)
      const incomingResponse = await apiClient.get(
        `/api/borrow-requests?userId=${userId}&role=owner`
      );
      const incomingData =
        incomingResponse.data.requests || incomingResponse.data;
      setIncomingRequests(Array.isArray(incomingData) ? incomingData : []);

      // Load outgoing requests (as borrower)
      const outgoingResponse = await apiClient.get(
        `/api/borrow-requests?userId=${userId}&role=borrower`
      );
      const outgoingData =
        outgoingResponse.data.requests || outgoingResponse.data;
      setOutgoingRequests(Array.isArray(outgoingData) ? outgoingData : []);
    } catch (error) {
      console.error("Error loading requests:", error);
      setError("Failed to load requests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleAccept = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await apiClient.post(`/api/borrow-requests/${requestId}/accept`, {
        userId,
      });
      await loadRequests();
      alert("Request accepted successfully!");
    } catch (error: any) {
      console.error("Error accepting request:", error);
      alert(error.response?.data?.error || "Failed to accept request");
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
      await loadRequests();
      alert("Request declined");
    } catch (error: any) {
      console.error("Error declining request:", error);
      alert(error.response?.data?.error || "Failed to decline request");
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
      await loadRequests();
      alert("Request cancelled");
    } catch (error: any) {
      console.error("Error cancelling request:", error);
      alert(error.response?.data?.error || "Failed to cancel request");
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
      await loadRequests();
      setEditingRequest(null);
      alert("Request updated successfully!");
    } catch (error: any) {
      console.error("Error updating request:", error);
      alert(error.response?.data?.error || "Failed to update request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (requestId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this request? This action cannot be undone."
      )
    )
      return;

    setActionLoading(requestId);
    try {
      await apiClient.delete(`/api/borrow-requests/${requestId}`, {
        data: { userId },
      });
      await loadRequests();
      alert("Request deleted");
    } catch (error: any) {
      console.error("Error deleting request:", error);
      alert(error.response?.data?.error || "Failed to delete request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkReturned = async (requestId: string) => {
    if (
      !confirm(
        "Mark this item as returned? This will make the item available again and notify the borrower."
      )
    )
      return;

    setActionLoading(requestId);
    try {
      await apiClient.post(`/api/borrow-requests/${requestId}/mark-returned`, {
        userId,
      });
      await loadRequests();
      alert(
        "Item marked as returned successfully! The item is now available in your groups."
      );
    } catch (error: any) {
      console.error("Error marking as returned:", error);
      alert(error.response?.data?.error || "Failed to mark as returned");
    } finally {
      setActionLoading(null);
    }
  };

  const handleInitiateReturn = async (loanId: string) => {
    if (
      !confirm(
        "Have you returned this item? The owner will need to confirm receipt before the item becomes available again."
      )
    )
      return;

    setActionLoading(loanId);
    try {
      await apiClient.post(`/api/loans/${loanId}/request-return`, { userId });
      await loadRequests();
      alert(
        "Return initiated! The owner will be notified to confirm they received the item back."
      );
    } catch (error: any) {
      console.error("Error initiating return:", error);
      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to initiate return"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReturn = async (loanId: string, requestId: string) => {
    if (
      !confirm(
        "Confirm that you received the item back? This will make it available again."
      )
    )
      return;

    setActionLoading(requestId);
    try {
      await apiClient.post(`/api/loans/${loanId}/confirm-return`, { userId });
      await loadRequests();
      alert(
        "Return confirmed! The item is now available in your groups again."
      );
    } catch (error: any) {
      console.error("Error confirming return:", error);
      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to confirm return"
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

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    }
    if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? "s" : ""} ago`;
    }
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} month${months !== 1 ? "s" : ""} ago`;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
      APPROVED: "bg-green-100 text-green-800 border-green-200",
      REJECTED: "bg-red-100 text-red-800 border-red-200",
      CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
          styles[status as keyof typeof styles] || styles.PENDING
        }`}
      >
        {status}
      </span>
    );
  };

  const renderRequest = (request: BorrowRequest, isOwner: boolean) => {
    const isPending = request.status === "PENDING";
    const isActionable = isPending && !actionLoading;

    return (
      <div
        key={request.id}
        className="bg-white border-2 border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
      >
        {/* Status Banner */}
        <div
          className={`px-4 py-2 flex items-center justify-between ${
            request.status === "PENDING"
              ? "bg-amber-50 border-b-2 border-amber-200"
              : request.status === "APPROVED" &&
                request.loan?.status === "ACTIVE"
              ? "bg-emerald-50 border-b-2 border-emerald-200"
              : request.status === "APPROVED" &&
                request.loan?.status === "RETURNED"
              ? "bg-blue-50 border-b-2 border-blue-200"
              : request.status === "REJECTED"
              ? "bg-red-50 border-b-2 border-red-200"
              : "bg-gray-50 border-b-2 border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {request.status === "PENDING" && (
              <span className="text-sm font-semibold text-amber-900">
                Pending Approval
              </span>
            )}
            {request.status === "APPROVED" &&
              request.loan?.status === "ACTIVE" && (
                <span className="text-sm font-semibold text-emerald-900">
                  Currently Borrowed
                </span>
              )}
            {request.status === "APPROVED" &&
              request.loan?.status === "RETURNED" && (
                <span className="text-sm font-semibold text-blue-900">
                  Returned
                </span>
              )}
            {request.status === "REJECTED" && (
              <span className="text-sm font-semibold text-red-900">
                Declined
              </span>
            )}
            {request.status === "CANCELLED" && (
              <span className="text-sm font-semibold text-gray-900">
                Cancelled
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {getTimeAgo(request.createdAt)}
          </span>
        </div>

        <div className="p-5">
          {/* Header with Image and Title */}
          <div className="flex gap-4 mb-4">
            {request.resource.image && (
              <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                <img
                  src={request.resource.image}
                  alt={request.resource.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {request.resource.title}
              </h3>
              {request.resource.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {request.resource.description}
                </p>
              )}
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {/* Person */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  {isOwner ? "Requested by" : "Owner"}
                </p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {isOwner
                    ? request.borrower.name || request.borrower.email
                    : request.owner.name || request.owner.email}
                </p>
              </div>
            </div>

            {/* Group */}
            {request.group && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Group
                  </p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {request.group.name}
                  </p>
                </div>
              </div>
            )}

            {/* Borrow Period */}
            <div
              className={`p-3 bg-gray-50 rounded-lg ${
                !request.group ? "md:col-span-2" : ""
              }`}
            >
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Borrow Period
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDate(request.startDate)}{" "}
                  <span className="text-gray-400">→</span>{" "}
                  {formatDate(request.endDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Message Bubble */}
          {request.message && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Message
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-3">
                <p className="text-sm text-gray-700 italic">
                  "{request.message}"
                </p>
              </div>
            </div>
          )}

          {/* Return Status Banner */}
          {request.loan?.status === "PENDING_RETURN_CONFIRMATION" && (
            <div className="mb-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-3">
              <div className="flex items-center gap-2 text-amber-800">
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm font-medium">
                  {isOwner
                    ? "Borrower says they've returned this. Please confirm."
                    : "Return initiated. Waiting for owner confirmation."}
                </p>
              </div>
            </div>
          )}

          {/* Completed Return Banner */}
          {request.status === "APPROVED" &&
            request.loan?.status === "RETURNED" && (
              <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-400 rounded-r-lg p-3">
                <div className="flex items-center gap-2 text-emerald-800">
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {isOwner
                        ? "You confirmed this item was returned"
                        : "Item successfully returned"}
                    </p>
                    {request.loan?.returnedDate && (
                      <p className="text-xs text-emerald-600 mt-0.5">
                        Returned on {formatDate(request.loan.returnedDate)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {isOwner && isPending && (
              <>
                <button
                  onClick={() => handleAccept(request.id)}
                  disabled={actionLoading === request.id}
                  className="flex-1 min-w-[120px] bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading === request.id ? (
                    "Processing..."
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Accept
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDecline(request.id)}
                  disabled={actionLoading === request.id}
                  className="flex-1 min-w-[120px] bg-white border-2 border-red-200 hover:bg-red-50 text-red-700 text-sm font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Decline
                </button>
              </>
            )}

            {!isOwner && isPending && (
              <>
                <button
                  onClick={() => handleEdit(request)}
                  disabled={actionLoading === request.id}
                  className="flex-1 min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => handleCancel(request.id)}
                  disabled={actionLoading === request.id}
                  className="flex-1 min-w-[120px] bg-white border-2 border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === request.id ? "Cancelling..." : "Cancel"}
                </button>
              </>
            )}

            {/* Delete button for rejected/cancelled requests */}
            {(request.status === "REJECTED" ||
              request.status === "CANCELLED") && (
              <button
                onClick={() => handleDelete(request.id)}
                disabled={actionLoading === request.id}
                className="flex-1 bg-white border-2 border-red-200 hover:bg-red-50 text-red-700 text-sm font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === request.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Remove Request
                  </span>
                )}
              </button>
            )}

            {/* Borrower: Return button for active loans */}
            {!isOwner &&
              request.status === "APPROVED" &&
              request.loan?.status === "ACTIVE" && (
                <button
                  onClick={() => handleInitiateReturn(request.loan!.id)}
                  disabled={actionLoading === request.id}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading === request.id ? (
                    "Processing..."
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                        />
                      </svg>
                      I've Returned This
                    </>
                  )}
                </button>
              )}

            {/* Owner: Confirm Return button */}
            {isOwner &&
              request.status === "APPROVED" &&
              request.loan?.status === "PENDING_RETURN_CONFIRMATION" && (
                <button
                  onClick={() =>
                    handleConfirmReturn(request.loan!.id, request.id)
                  }
                  disabled={actionLoading === request.id}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading === request.id ? (
                    "Processing..."
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Confirm Return
                    </>
                  )}
                </button>
              )}

            {/* Legacy: Mark as Returned */}
            {isOwner &&
              request.status === "APPROVED" &&
              request.loan?.status === "ACTIVE" && (
                <button
                  onClick={() => handleMarkReturned(request.id)}
                  disabled={actionLoading === request.id}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white text-sm font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed opacity-60"
                  title="Legacy: Ask borrower to use 'I've Returned This' instead"
                >
                  {actionLoading === request.id
                    ? "Processing..."
                    : "Mark as Returned (Legacy)"}
                </button>
              )}
          </div>
        </div>
      </div>
    );
  };

  const currentRequests =
    activeTab === "incoming" ? incomingRequests : outgoingRequests;

  // Filter requests based on statusFilter
  const filteredRequests = Array.isArray(currentRequests)
    ? currentRequests.filter((r) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "active")
          return r.status === "APPROVED" && r.loan?.status === "ACTIVE";
        if (statusFilter === "completed")
          return r.status === "APPROVED" && r.loan?.status === "RETURNED";
        return true;
      })
    : [];

  const pendingCount = Array.isArray(currentRequests)
    ? currentRequests.filter((r) => r.status === "PENDING").length
    : 0;

  // Count pending return confirmations (owner needs to confirm)
  const pendingReturnConfirmations = Array.isArray(incomingRequests)
    ? incomingRequests.filter(
        (r) =>
          r.status === "APPROVED" &&
          r.loan?.status === "PENDING_RETURN_CONFIRMATION"
      ).length
    : 0;

  // Count pending returns waiting for owner (borrower initiated)
  const myPendingReturns = Array.isArray(outgoingRequests)
    ? outgoingRequests.filter(
        (r) =>
          r.status === "APPROVED" &&
          r.loan?.status === "PENDING_RETURN_CONFIRMATION"
      ).length
    : 0;

  // Get pending incoming requests that need approval
  const pendingApprovals = Array.isArray(incomingRequests)
    ? incomingRequests.filter((r) => r.status === "PENDING")
    : [];

  return (
    <div className="w-full">
      {/* Action Required Section - Only show if there are pending approvals */}
      {pendingApprovals.length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <svg
                className="w-6 h-6 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-900">
                Requires Your Approval
              </h3>
              <p className="text-sm text-amber-700">
                {pendingApprovals.length}{" "}
                {pendingApprovals.length === 1 ? "request" : "requests"} waiting
                for your response
              </p>
            </div>
            <button
              onClick={() => {
                setActiveTab("incoming");
                setStatusFilter("all");
              }}
              className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors"
            >
              Review {pendingApprovals.length > 3 ? "All" : ""}
            </button>
          </div>

          {/* Show first 3 pending requests as preview */}
          <div className="grid gap-3">
            {pendingApprovals.slice(0, 3).map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg p-4 border border-amber-200 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">
                        {request.resource.title}
                      </h4>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                        Pending
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">
                        {request.borrower.name || request.borrower.email}
                      </span>{" "}
                      wants to borrow this
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(request.startDate).toLocaleDateString()} -{" "}
                      {new Date(request.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(request.id)}
                      disabled={actionLoading === request.id}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecline(request.id)}
                      disabled={actionLoading === request.id}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pendingApprovals.length > 3 && (
            <p className="text-center text-sm text-amber-700 mt-3">
              + {pendingApprovals.length - 3} more{" "}
              {pendingApprovals.length - 3 === 1 ? "request" : "requests"}
            </p>
          )}
        </div>
      )}

      {/* Tab Navigation - Lending/Borrowing */}
      <div className="bg-gray-100 rounded-lg p-1 mb-4 inline-flex gap-1 max-w-md mx-auto">
        <button
          onClick={() => setActiveTab("incoming")}
          className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-all duration-200 relative flex items-center justify-center gap-2 ${
            activeTab === "incoming"
              ? "bg-primary-600 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
          }`}
        >
          <span>Lending Out</span>
          {pendingApprovals.length > 0 && (
            <span
              className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1.5 text-xs font-bold rounded-full ${
                activeTab === "incoming"
                  ? "bg-white text-primary-600"
                  : "bg-amber-500 text-white"
              }`}
            >
              {pendingApprovals.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("outgoing")}
          className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-all duration-200 relative flex items-center justify-center gap-2 ${
            activeTab === "outgoing"
              ? "bg-primary-600 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
          }`}
        >
          <span>Borrowing</span>
          {Array.isArray(outgoingRequests) &&
            outgoingRequests.filter((r) => r.status === "PENDING").length >
              0 && (
              <span
                className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1.5 text-xs font-bold rounded-full ${
                  activeTab === "outgoing"
                    ? "bg-white text-primary-600"
                    : "bg-primary-600 text-white"
                }`}
              >
                {outgoingRequests.filter((r) => r.status === "PENDING").length}
              </span>
            )}
        </button>
      </div>

      {/* Status Filters - Simplified */}
      <div className="bg-gray-100 rounded-lg p-1 mb-6 inline-flex gap-1 max-w-2xl mx-auto w-full">
        {/* All */}
        <button
          onClick={() => setStatusFilter("all")}
          className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${
            statusFilter === "all"
              ? "bg-primary-600 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
          }`}
        >
          <span>All</span>
        </button>

        {/* Active */}
        <button
          onClick={() =>
            setStatusFilter(statusFilter === "active" ? "all" : "active")
          }
          className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${
            statusFilter === "active"
              ? "bg-primary-600 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
          }`}
        >
          <span>Active</span>
          <span
            className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1.5 text-xs font-bold rounded-full ${
              statusFilter === "active"
                ? "bg-white text-primary-600"
                : "bg-primary-600 text-white"
            }`}
          >
            {activeTab === "incoming"
              ? incomingRequests.filter(
                  (r) => r.status === "APPROVED" && r.loan?.status === "ACTIVE"
                ).length
              : outgoingRequests.filter(
                  (r) => r.status === "APPROVED" && r.loan?.status === "ACTIVE"
                ).length}
          </span>
        </button>

        {/* Completed */}
        <button
          onClick={() =>
            setStatusFilter(statusFilter === "completed" ? "all" : "completed")
          }
          className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${
            statusFilter === "completed"
              ? "bg-primary-600 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>Completed</span>
          <span
            className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1.5 text-xs font-bold rounded-full ${
              statusFilter === "completed"
                ? "bg-white text-primary-600"
                : "bg-primary-600 text-white"
            }`}
          >
            {activeTab === "incoming"
              ? incomingRequests.filter(
                  (r) =>
                    r.status === "APPROVED" && r.loan?.status === "RETURNED"
                ).length
              : outgoingRequests.filter(
                  (r) =>
                    r.status === "APPROVED" && r.loan?.status === "RETURNED"
                ).length}
          </span>
        </button>
      </div>

      {/* Notification Banner for Pending Return Confirmations */}
      {pendingReturnConfirmations > 0 && activeTab === "incoming" && (
        <div className="mb-4 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-2 w-2 text-amber-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-amber-800">
                Action Required: Return Confirmation
                {pendingReturnConfirmations > 1 ? "s" : ""}
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>
                  You have <strong>{pendingReturnConfirmations}</strong>{" "}
                  {pendingReturnConfirmations === 1 ? "item" : "items"} waiting
                  for your confirmation that{" "}
                  {pendingReturnConfirmations === 1 ? "it was" : "they were"}{" "}
                  returned. Please check the{" "}
                  {pendingReturnConfirmations === 1 ? "item" : "items"} and
                  click <strong>"Confirm Return"</strong> to make{" "}
                  {pendingReturnConfirmations === 1 ? "it" : "them"} available
                  again.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification for borrower waiting on owner */}
      {myPendingReturns > 0 && activeTab === "outgoing" && (
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800">
                Waiting for Owner Confirmation
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  You've initiated return for{" "}
                  <strong>{myPendingReturns}</strong>{" "}
                  {myPendingReturns === 1 ? "item" : "items"}. Waiting for the
                  owner to confirm receipt.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {error ? (
        <div className="text-center py-12 bg-red-50 rounded-lg border-2 border-red-200">
          <svg
            className="mx-auto h-12 w-12 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button
            onClick={() => loadRequests()}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Try Again
          </button>
        </div>
      ) : loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <p className="mt-2 text-gray-600">Loading requests...</p>
        </div>
      ) : !Array.isArray(filteredRequests) || filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No {statusFilter !== "all" ? statusFilter : ""} requests
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {statusFilter !== "all"
              ? `No ${statusFilter} requests found. Click a stat card to see all requests.`
              : activeTab === "incoming"
              ? "You don't have any incoming borrow requests yet."
              : "You haven't made any borrow requests yet."}
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          {pendingCount > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">{pendingCount}</span> pending
                request
                {pendingCount !== 1 ? "s" : ""} require
                {pendingCount === 1 ? "s" : ""}{" "}
                {activeTab === "incoming" ? "your attention" : "response"}
              </p>
            </div>
          )}

          {/* Request List */}
          <div className="space-y-4">
            {Array.isArray(filteredRequests) &&
              filteredRequests.map((request) =>
                renderRequest(request, activeTab === "incoming")
              )}
          </div>
        </>
      )}

      {/* Edit Request Modal */}
      {editingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Borrow Request
              </h3>
              <button
                onClick={() => setEditingRequest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resource
                </label>
                <p className="text-gray-900 font-medium">
                  {editingRequest.resource.title}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, endDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message (Optional)
                </label>
                <textarea
                  value={editForm.message}
                  onChange={(e) =>
                    setEditForm({ ...editForm, message: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Add a message for the owner..."
                />
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setEditingRequest(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRequest}
                  disabled={actionLoading === editingRequest.id}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === editingRequest.id
                    ? "Updating..."
                    : "Update Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestDashboard;
