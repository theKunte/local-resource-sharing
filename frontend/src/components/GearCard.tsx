import React from "react";

export type Gear = {
  id: string;
  title: string;
  description: string;
  image?: string;
  status?: string;
  currentLoan?: {
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
};

interface GearCardProps {
  id: string;
  title: string;
  description: string;
  image?: string;
  isAvailable?: boolean;
  status?: string;
  currentLoan?: {
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
  onEdit?: (gear: {
    id: string;
    title: string;
    description: string;
    image?: string;
  }) => void;
  onManageGroups?: (gear: {
    id: string;
    title: string;
    description: string;
    image?: string;
  }) => void;
  onRequestBorrow?: (gearId: string) => void;
  showActions?: boolean;
}

const GearCard: React.FC<GearCardProps> = ({
  id,
  title,
  description,
  image,
  isAvailable = true,
  status,
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
      className={`group bg-white border rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col ${
        isBorrowed 
          ? "border-warning-200 bg-warning-50/30" 
          : "border-gray-200 hover:border-primary-300 hover:-translate-y-1"
      }`}
    >
      {/* Image Section */}
      {image && (
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          {isBorrowed && (
            <div className="absolute top-3 right-3 animate-fade-in">
              <span className="bg-warning-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z"/>
                </svg>
                Borrowed
              </span>
            </div>
          )}
          {/* Edit/Delete overlay for owner */}
          {showActions && (
            <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {onEdit && (
                <button
                  onClick={() => onEdit({ id, title, description, image })}
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
                    onManageGroups({ id, title, description, image })
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
      <div className="p-5 flex-1 flex flex-col">
        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed flex-1">
          {description}
        </p>

        {/* Availability Status & Borrower Info */}
        {isBorrowed && currentLoan ? (
          <div className="mt-auto pt-4 border-t border-warning-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-warning-200 flex items-center justify-center font-semibold text-warning-700 text-xs">
                {currentLoan.borrower.name?.[0]?.toUpperCase() || currentLoan.borrower.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-warning-800 truncate">
                  {currentLoan.borrower.name || currentLoan.borrower.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-warning-700">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Due back {formatDate(currentLoan.endDate)}</span>
            </div>
          </div>
        ) : (
          <div className="mt-auto pt-4 border-t border-gray-100">
            <span
              className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold ${
                isAvailable
                  ? "bg-success-100 text-success-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full mr-2 animate-pulse ${
                  isAvailable ? "bg-success-500" : "bg-gray-400"
                }`}
              ></span>
              {isAvailable ? "Available Now" : "Unavailable"}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          {!showActions && onRequestBorrow && (
            <button
              onClick={() => {
                if (isBorrowed) return;
                try {
                  onRequestBorrow(id);
                } catch (error) {
                  console.error(
                    "[GearCard] Error calling onRequestBorrow:",
                    error
                  );
                }
              }}
              disabled={!!isBorrowed}
              className={`flex-1 text-sm font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-sm ${
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
                  onClick={() => onEdit({ id, title, description, image })}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-md active:scale-95"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(id)}
                  className="flex-1 bg-danger-100 hover:bg-danger-200 text-danger-700 text-sm font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-md active:scale-95"
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
