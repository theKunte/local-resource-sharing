import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, ChevronRight, Filter, Check, X, Edit, Trash2, Package } from "lucide-react";
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

type StatusFilter = "all" | "active" | "completed";

const StatusBadge = ({ status, loanStatus }: { status: string; loanStatus?: string }) => {
  let displayText = status;
  let colorClasses = "bg-gray-100 text-gray-700 border-gray-200";

  if (status === "PENDING") {
    displayText = "Pending";
    colorClasses = "bg-amber-100 text-amber-700 border-amber-200";
  } else if (status === "APPROVED" && loanStatus === "ACTIVE") {
    displayText = "Borrowed";
    colorClasses = "bg-blue-100 text-blue-700 border-blue-200";
  } else if (status === "APPROVED" && loanStatus === "RETURNED") {
    displayText = "Returned";
    colorClasses = "bg-sage-600 text-white border-sage-700";
  } else if (status === "APPROVED" && loanStatus === "PENDING_RETURN_CONFIRMATION") {
    displayText = "Pending Return";
    colorClasses = "bg-purple-100 text-purple-700 border-purple-200";
  } else if (status === "REJECTED") {
    displayText = "Rejected";
    colorClasses = "bg-red-100 text-red-700 border-red-200";
  } else if (status === "CANCELLED") {
    displayText = "Cancelled";
    colorClasses = "bg-gray-100 text-gray-700 border-gray-200";
  }

  return (
    <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${colorClasses}`}>
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
  const isActive = isApproved && request.loan?.status === "ACTIVE";
  const isPendingReturn = isApproved && request.loan?.status === "PENDING_RETURN_CONFIRMATION";
  const isReturned = isApproved && request.loan?.status === "RETURNED";

  const getStatusMessage = () => {
    if (isPending) return "Waiting for approval";
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
      className="bg-white rounded-3xl p-6 shadow-sm mb-4 border border-gray-100 hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-4">
        <StatusBadge status={request.status} loanStatus={request.loan?.status} />
        <div className="flex items-center gap-1.5 text-slate-400 text-sm">
          <span>{formatDate(request.createdAt)}</span>
          <Clock size={16} />
        </div>
      </div>

      <div className="flex gap-4">
        {request.resource.image && (
          <div className="w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100">
            <img
              src={request.resource.image}
              alt={request.resource.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-slate-900 truncate mb-0.5">
            {request.resource.title}
          </h3>
          <p className="text-slate-400 text-sm mb-4 truncate">
            {request.resource.description}
          </p>

          <div className="space-y-2">
            <div className="flex text-[11px] uppercase tracking-wider font-semibold">
              <span className="text-slate-400 w-20">
                {isOwner ? "Borrower" : "Owner"}
              </span>
              <span className="text-slate-700">
                {isOwner
                  ? request.borrower.name || request.borrower.email
                  : request.owner.name || request.owner.email}
              </span>
            </div>
            {request.group && (
              <div className="flex text-[11px] uppercase tracking-wider font-semibold">
                <span className="text-slate-400 w-20">Group</span>
                <span className="text-slate-700">{request.group.name}</span>
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

        <p className="text-xs text-slate-400 italic mb-4">{getStatusMessage()}</p>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {isOwner && isPending && (
            <>
              <button
                onClick={() => onAccept(request.id)}
                disabled={actionLoading === request.id}
                className="flex items-center gap-1.5 px-4 py-2 bg-sage-600 text-white rounded-xl text-sm font-semibold hover:bg-sage-700 disabled:opacity-50 transition-colors"
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
              className="flex items-center gap-1.5 px-4 py-2 bg-sage-600 text-white rounded-xl text-sm font-semibold hover:bg-sage-700 disabled:opacity-50 transition-colors"
            >
              <Package size={16} />
              {actionLoading === request.id ? "Processing..." : "Mark as Returned"}
            </button>
          )}

          {!isOwner && isActive && request.loan && (
            <button
              onClick={() => onInitiateReturn(request.loan!.id)}
              disabled={actionLoading === request.loan.id}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl text-sm font-semibold hover:bg-purple-200 disabled:opacity-50 transition-colors"
            >
              <Package size={16} />
              {actionLoading === request.loan.id ? "Processing..." : "I Returned This"}
            </button>
          )}

          {isOwner && isPendingReturn && request.loan && (
            <button
              onClick={() => onConfirmReturn(request.loan!.id, request.id)}
              disabled={actionLoading === request.id}
              className="flex items-center gap-1.5 px-4 py-2 bg-sage-600 text-white rounded-xl text-sm font-semibold hover:bg-sage-700 disabled:opacity-50 transition-colors"
            >
              <Check size={16} />
              {actionLoading === request.id ? "Confirming..." : "Confirm Return"}
            </button>
          )}

          {!isOwner && (request.status === "REJECTED" || request.status === "CANCELLED") && (
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
    </motion.div>
  );
};

const RequestDashboard: React.FC<RequestDashboardProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [incomingRequests, setIncomingRequests] = useState<BorrowRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState<BorrowRequest | null>(null);
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
        `/api/borrow-requests?userId=${userId}&role=owner`,
      );
      const incomingData = incomingResponse.data.requests || incomingResponse.data;
      setIncomingRequests(Array.isArray(incomingData) ? incomingData : []);

      // Load outgoing requests (as borrower)
      const outgoingResponse = await apiClient.get(
        `/api/borrow-requests?userId=${userId}&role=borrower`,
      );
      const outgoingData = outgoingResponse.data.requests || outgoingResponse.data;
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
      await apiClient.post(`/api/borrow-requests/${requestId}/accept`, { userId });
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
      await apiClient.post(`/api/borrow-requests/${requestId}/decline`, { userId });
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
      await apiClient.post(`/api/borrow-requests/${requestId}/cancel`, { userId });
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
    if (!confirm("Are you sure you want to delete this request? This action cannot be undone."))
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
        "Mark this item as returned? This will make the item available again and notify the borrower.",
      )
    )
      return;

    setActionLoading(requestId);
    try {
      await apiClient.post(`/api/borrow-requests/${requestId}/mark-returned`, { userId });
      await loadRequests();
      alert("Item marked as returned successfully! The item is now available in your groups.");
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
        "Have you returned this item? The owner will need to confirm receipt before the item becomes available again.",
      )
    )
      return;

    setActionLoading(loanId);
    try {
      await apiClient.post(`/api/loans/${loanId}/request-return`, { userId });
      await loadRequests();
      alert(
        "Return initiated! The owner will be notified to confirm they received the item back.",
      );
    } catch (error: any) {
      console.error("Error initiating return:", error);
      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to initiate return",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReturn = async (loanId: string, requestId: string) => {
    if (
      !confirm("Confirm that you received the item back? This will make it available again.")
    )
      return;

    setActionLoading(requestId);
    try {
      await apiClient.post(`/api/loans/${loanId}/confirm-return`, { userId });
      await loadRequests();
      alert("Return confirmed! The item is now available in your groups again.");
    } catch (error: any) {
      console.error("Error confirming return:", error);
      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
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
    
    if (statusFilter === "active") {
      return requests.filter(
        (req) => req.status === "PENDING" || (req.status === "APPROVED" && req.loan?.status === "ACTIVE")
      );
    }
    
    if (statusFilter === "completed") {
      return requests.filter(
        (req) =>
          req.status === "REJECTED" ||
          req.status === "CANCELLED" ||
          (req.status === "APPROVED" && req.loan?.status === "RETURNED")
      );
    }
    
    return requests;
  };

  const currentRequests = activeTab === "incoming" ? incomingRequests : outgoingRequests;
  const filteredRequests = filterRequests(currentRequests);

  const statusFilterTabs: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
  ];

  if (loading && currentRequests.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="bg-white/50 p-1 rounded-2xl flex gap-1">
          <button
            onClick={() => setActiveTab("incoming")}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === "incoming"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Incoming ({incomingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("outgoing")}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === "outgoing"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Outgoing ({outgoingRequests.length})
          </button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-6">
        <div className="bg-white/50 p-1 rounded-2xl flex gap-1">
          {statusFilterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                statusFilter === tab.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
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
              isOwner={activeTab === "incoming"}
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
            className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-3xl border border-gray-100"
          >
            <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
              <Filter size={24} className="text-sage-600" />
            </div>
            <p className="font-medium text-lg">No {statusFilter} requests</p>
            <p className="text-sm mt-1">
              {activeTab === "incoming"
                ? "You have no incoming borrow requests"
                : "You haven't made any borrow requests yet"}
            </p>
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
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Edit Request</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    value={editForm.message}
                    onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 resize-none"
                    placeholder="Add a note to the owner..."
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUpdateRequest}
                  disabled={actionLoading === editingRequest.id}
                  className="flex-1 py-3 bg-sage-600 text-white rounded-xl font-semibold hover:bg-sage-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading === editingRequest.id ? "Saving..." : "Save Changes"}
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
