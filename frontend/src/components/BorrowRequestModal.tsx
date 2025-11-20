import React, { useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";

interface BorrowRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceId: string;
  resourceTitle: string;
  userId: string;
  groupId?: string; // Optional groupId
}

const BorrowRequestModal: React.FC<BorrowRequestModalProps> = ({
  isOpen,
  onClose,
  resourceId,
  resourceTitle,
  userId,
  groupId,
}) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});

  console.log(
    "BorrowRequestModal render - isOpen:",
    isOpen,
    "resourceTitle:",
    resourceTitle
  );

  const handleClose = () => {
    setStartDate("");
    setEndDate("");
    setMessage("");
    setError(null);
    setValidationErrors({});
    onClose();
  };

  if (!isOpen) {
    console.log("BorrowRequestModal: returning null because isOpen is false");
    return null;
  }

  console.log("BorrowRequestModal: rendering modal JSX");

  const validateDates = (): boolean => {
    const errors: { startDate?: string; endDate?: string } = {};

    if (!startDate) {
      errors.startDate = "Start date is required";
    } else {
      const start = new Date(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start < today) {
        errors.startDate = "Start date cannot be in the past";
      }
    }

    if (!endDate) {
      errors.endDate = "End date is required";
    } else if (startDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end <= start) {
        errors.endDate = "End date must be after start date";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateDates()) {
      return;
    }

    setSubmitting(true);

    try {
      await axios.post("http://localhost:3001/api/borrow-requests", {
        resourceId,
        borrowerId: userId,
        groupId: groupId || undefined, // Include groupId if provided
        startDate,
        endDate,
        message: message.trim() || undefined,
      });

      // Reset form
      setStartDate("");
      setEndDate("");
      setMessage("");
      setValidationErrors({});

      // Close modal and show success
      onClose();
      alert("Borrow request sent successfully!");
    } catch (err: any) {
      console.error("Error creating borrow request:", err);

      // Show backend error/message for all errors including 409
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Failed to send borrow request. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split("T")[0];

  console.log("BorrowRequestModal: about to return JSX");

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: 99999,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Request to Borrow
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={submitting}
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Resource Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item
            </label>
            <div className="text-gray-900 font-semibold">{resourceTitle}</div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Start Date */}
          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setValidationErrors((prev) => ({
                  ...prev,
                  startDate: undefined,
                }));
              }}
              min={today}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                validationErrors.startDate
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300"
              }`}
              disabled={submitting}
            />
            {validationErrors.startDate && (
              <p className="mt-1 text-sm text-red-600">
                {validationErrors.startDate}
              </p>
            )}
          </div>

          {/* End Date */}
          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setValidationErrors((prev) => ({
                  ...prev,
                  endDate: undefined,
                }));
              }}
              min={startDate || today}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                validationErrors.endDate
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300"
              }`}
              disabled={submitting}
            />
            {validationErrors.endDate && (
              <p className="mt-1 text-sm text-red-600">
                {validationErrors.endDate}
              </p>
            )}
          </div>

          {/* Message */}
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Message (Optional)
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Add a note to the owner about your request..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              disabled={submitting}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? "Sending..." : "Send Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BorrowRequestModal;
