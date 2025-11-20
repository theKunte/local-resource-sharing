import React, { useState, useEffect } from "react";
import axios from "axios";

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
    status: "ACTIVE" | "RETURNED";
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
      const incomingResponse = await axios.get(
        `http://localhost:3001/api/borrow-requests?userId=${userId}&role=owner`
      );
      console.log("Incoming requests response:", incomingResponse.data);
      const incomingData =
        incomingResponse.data.requests || incomingResponse.data;
      setIncomingRequests(Array.isArray(incomingData) ? incomingData : []);

      // Load outgoing requests (as borrower)
      const outgoingResponse = await axios.get(
        `http://localhost:3001/api/borrow-requests?userId=${userId}&role=borrower`
      );
      console.log("Outgoing requests response:", outgoingResponse.data);
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
      await axios.post(
        `http://localhost:3001/api/borrow-requests/${requestId}/accept`,
        { userId }
      );
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
      await axios.post(
        `http://localhost:3001/api/borrow-requests/${requestId}/decline`,
        { userId }
      );
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
      await axios.post(
        `http://localhost:3001/api/borrow-requests/${requestId}/cancel`,
        { userId }
      );
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
      await axios.put(
        `http://localhost:3001/api/borrow-requests/${editingRequest.id}`,
        {
          userId,
          startDate: editForm.startDate,
          endDate: editForm.endDate,
          message: editForm.message,
        }
      );
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
      await axios.delete(
        `http://localhost:3001/api/borrow-requests/${requestId}`,
        { data: { userId } }
      );
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
      await axios.post(
        `http://localhost:3001/api/borrow-requests/${requestId}/mark-returned`,
        { userId }
      );
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
        className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex gap-4">
          {/* Resource Image */}
          {request.resource.image && (
            <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={request.resource.image}
                alt={request.resource.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Request Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {request.resource.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {isOwner ? (
                    <>
                      Requested by{" "}
                      <span className="font-medium">
                        {request.borrower.name || request.borrower.email}
                      </span>
                    </>
                  ) : (
                    <>
                      Owner:{" "}
                      <span className="font-medium">
                        {request.owner.name || request.owner.email}
                      </span>
                    </>
                  )}
                </p>
              </div>
              {getStatusBadge(request.status)}
            </div>

            {/* Group Info */}
            {request.group && (
              <div className="mb-2">
                <span className="inline-flex items-center gap-1 text-sm text-gray-600">
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Group:{" "}
                  <span className="font-medium">{request.group.name}</span>
                </span>
              </div>
            )}

            {/* Dates */}
            <div className="mb-3">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>
                  {formatDate(request.startDate)} -{" "}
                  {formatDate(request.endDate)}
                </span>
              </div>
            </div>

            {/* Message */}
            {request.message && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700 italic">
                  "{request.message}"
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              {isOwner && isPending && (
                <>
                  <button
                    onClick={() => handleAccept(request.id)}
                    disabled={actionLoading === request.id}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === request.id ? "Processing..." : "Accept"}
                  </button>
                  <button
                    onClick={() => handleDecline(request.id)}
                    disabled={actionLoading === request.id}
                    className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Decline
                  </button>
                </>
              )}

              {!isOwner && isPending && (
                <>
                  <button
                    onClick={() => handleEdit(request)}
                    disabled={actionLoading === request.id}
                    className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleCancel(request.id)}
                    disabled={actionLoading === request.id}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === request.id ? "Cancelling..." : "Cancel"}
                  </button>
                </>
              )}

              {/* Delete button for non-pending requests (both owner and borrower) */}
              {!isPending && request.status !== "APPROVED" && (
                <button
                  onClick={() => handleDelete(request.id)}
                  disabled={actionLoading === request.id}
                  className="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === request.id ? "Deleting..." : "Delete"}
                </button>
              )}

              {/* Mark as Returned button for approved requests (owner only) */}
              {isOwner &&
                request.status === "APPROVED" &&
                request.loan?.status === "ACTIVE" && (
                  <button
                    onClick={() => handleMarkReturned(request.id)}
                    disabled={actionLoading === request.id}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === request.id
                      ? "Processing..."
                      : "Mark as Returned"}
                  </button>
                )}

              {!isActionable && request.status !== "PENDING" && (
                <div className="text-sm py-2">
                  {request.status === "APPROVED" &&
                    request.loan?.status === "RETURNED" && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-emerald-700 font-medium">
                          <svg
                            className="w-5 h-5"
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
                          <span>
                            {isOwner
                              ? "You confirmed this item was returned"
                              : "Item successfully returned"}
                          </span>
                        </div>
                        {request.loan?.returnedDate && (
                          <div className="text-emerald-600 text-xs mt-1 ml-7">
                            Returned on {formatDate(request.loan.returnedDate)}
                          </div>
                        )}
                      </div>
                    )}
                  {request.status === "APPROVED" &&
                    request.loan?.status !== "RETURNED" && (
                      <div className="text-gray-500">
                        This request has been approved
                      </div>
                    )}
                  {request.status === "REJECTED" && (
                    <div className="text-gray-500">
                      This request was declined
                    </div>
                  )}
                  {request.status === "CANCELLED" && (
                    <div className="text-gray-500">
                      This request was cancelled
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const currentRequests =
    activeTab === "incoming" ? incomingRequests : outgoingRequests;
  const pendingCount = Array.isArray(currentRequests)
    ? currentRequests.filter((r) => r.status === "PENDING").length
    : 0;

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("incoming")}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
            activeTab === "incoming"
              ? "text-emerald-600 border-b-2 border-emerald-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Incoming Requests
          {Array.isArray(incomingRequests) &&
            incomingRequests.filter((r) => r.status === "PENDING").length >
              0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-emerald-600 rounded-full">
                {incomingRequests.filter((r) => r.status === "PENDING").length}
              </span>
            )}
        </button>
        <button
          onClick={() => setActiveTab("outgoing")}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
            activeTab === "outgoing"
              ? "text-emerald-600 border-b-2 border-emerald-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          My Requests
          {Array.isArray(outgoingRequests) &&
            outgoingRequests.filter((r) => r.status === "PENDING").length >
              0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-yellow-500 rounded-full">
                {outgoingRequests.filter((r) => r.status === "PENDING").length}
              </span>
            )}
        </button>
      </div>

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
      ) : !Array.isArray(currentRequests) || currentRequests.length === 0 ? (
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
            No requests
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === "incoming"
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
            {Array.isArray(currentRequests) &&
              currentRequests.map((request) =>
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
