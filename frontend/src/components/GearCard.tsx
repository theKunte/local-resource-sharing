import React from "react";
import type { Resource, CurrentLoan } from "../types/api.types";

// Re-export Resource as Gear for backward compatibility
export type Gear = Resource;

interface GearCardProps extends Omit<
  Resource,
  "ownerId" | "status" | "currentLoan"
> {
  ownerId?: string;
  isAvailable?: boolean;
  status?: "AVAILABLE" | "BORROWED" | "UNAVAILABLE";
  currentLoan?:
    | CurrentLoan
    | {
        id: string;
        status: string;
        startDate: string;
        endDate: string;
        returnedDate?: string;
        borrower: {
          id: string;
          name?: string;
          email: string;
        };
      };
  onDelete?: (id: string) => void;
  onEdit?: (gear: Resource) => void;
  onManageGroups?: (gear: Resource) => void;
  onRequestBorrow?: (gearId: string) => void;
  showActions?: boolean;
}

const GearCard: React.FC<GearCardProps> = ({
  id,
  title,
  description,
  image,
  ownerId = "",
  isAvailable = true,
  status = "AVAILABLE",
  currentLoan,
  onDelete,
  onEdit,
  onRequestBorrow,
  showActions = false,
  onManageGroups,
}) => {
  const isBorrowed = status === "BORROWED" && currentLoan;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  return (
    <div
      className={`group bg-white border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden h-full flex flex-col ${
        isBorrowed
          ? "border-warning-200 bg-warning-50/30"
          : "border-gray-200 hover:border-primary-300 hover:-translate-y-0.5"
      }`}
    >
      {/* Image Section */}
      {image && (
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
          <img
            src={image}
            alt={title}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              isBorrowed ? "opacity-50 grayscale" : ""
            }`}
          />
          {isBorrowed && (
            <div className="absolute inset-0 bg-gray-900 opacity-20 pointer-events-none"></div>
          )}
          {/* Edit/Delete overlay for owner */}
          {showActions && (
            <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {onEdit && (
                <button
                  onClick={() =>
                    onEdit({
                      id,
                      title,
                      description,
                      image,
                      ownerId,
                      status,
                      currentLoan,
                    } as Resource)
                  }
                  className="bg-white/95 hover:bg-white text-gray-700 hover:text-success-600 rounded-lg p-2 shadow-md hover:shadow-lg transition-all duration-200 backdrop-blur-sm"
                  title="Edit gear"
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
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(id)}
                  className="bg-white/95 hover:bg-white text-gray-700 hover:text-danger-600 rounded-lg p-2 shadow-md hover:shadow-lg transition-all duration-200 backdrop-blur-sm"
                  title="Delete gear"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
              {onManageGroups && (
                <button
                  onClick={() =>
                    onManageGroups({
                      id,
                      title,
                      description,
                      image,
                      ownerId,
                      status,
                      currentLoan,
                    } as Resource)
                  }
                  className="bg-white/95 hover:bg-white text-gray-700 hover:text-primary-600 rounded-lg p-2 shadow-md hover:shadow-lg transition-all duration-200 backdrop-blur-sm"
                  title="Manage groups"
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
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content Section */}
      <div className="px-6 pt-6 pb-0 flex-1 flex flex-col">
        {/* Title & Status Row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1">
            <p className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors">
              <span className="text-sm text-gray-500 font-medium">Title: </span>
              {title}
            </p>
          </div>
          {!isBorrowed && (
            <span
              className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                isAvailable
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  isAvailable ? "bg-white animate-pulse" : "bg-gray-400"
                }`}
              ></span>
              {isAvailable ? "Available" : "Unavailable"}
            </span>
          )}
        </div>

        {/* Description */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            <span className="text-xs text-gray-500 font-medium">
              Description:{" "}
            </span>
            {description}
          </p>
        </div>

        {/* Borrower Info or Availability */}
        {isBorrowed && currentLoan ? (
          <div className="mb-4">
            <div className="mb-2 p-4 bg-gray-100 border border-gray-300 rounded-lg">
              <div className="flex items-center gap-1.5 mb-2">
                <p className="text-xs text-gray-600 font-medium">
                  Borrowed by:
                </p>
                <p className="text-sm font-semibold text-gray-700 truncate">
                  {currentLoan.borrower.name || currentLoan.borrower.email}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium">
                <span>Return by {formatDate(currentLoan.endDate)}</span>
              </div>
            </div>
            <span className="inline-block px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-400 text-white">
              Currently Borrowed
            </span>
          </div>
        ) : (
          <div className="mb-2">
            <span
              className={`inline-block px-3 py-1.5 rounded-lg text-xs font-semibold ${
                isAvailable
                  ? "bg-success-500 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {isAvailable ? "Available" : "Not available"}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-auto mb-6">
          {!showActions && onRequestBorrow && (
            <button
              onClick={() => {
                if (isBorrowed) return;
                try {
                  onRequestBorrow(id);
                } catch (error) {
                  console.error(
                    "[GearCard] Error calling onRequestBorrow:",
                    error,
                  );
                }
              }}
              disabled={!!isBorrowed}
              className={`flex-1 text-xs font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-sm ${
                isBorrowed
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-primary-500 hover:bg-primary-600 text-white hover:shadow-md active:scale-95"
              }`}
            >
              {isBorrowed ? "Currently Borrowed" : "Request to Borrow"}
            </button>
          )}

          {showActions && (
            <div className="flex gap-2 w-full">
              {onEdit && (
                <button
                  onClick={() =>
                    onEdit({
                      id,
                      title,
                      description,
                      image,
                      ownerId,
                      status,
                      currentLoan,
                    } as Resource)
                  }
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 hover:shadow-md active:scale-95"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(id)}
                  className="flex-1 bg-danger-100 hover:bg-danger-200 text-danger-700 text-xs font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 hover:shadow-md active:scale-95"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GearCard;
