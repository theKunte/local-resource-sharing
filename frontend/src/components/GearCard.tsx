import React from "react";

export type Gear = {
  id: string;
  title: string;
  description: string;
  image?: string;
};

interface GearCardProps {
  id: string;
  title: string;
  description: string;
  image?: string;
  isAvailable?: boolean;
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
  onDelete,
  onEdit,
  onRequestBorrow,
  showActions = false,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden h-full flex flex-col mb-8">
      {/* Image Section */}
      {image && (
        <div className="relative w-full aspect-[3/2] overflow-hidden bg-gray-100">
          <img src={image} alt={title} className="w-full h-full object-cover" />
          {/* Edit/Delete overlay for owner */}
          {showActions && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity duration-200">
              {onEdit && (
                <button
                  onClick={() => onEdit({ id, title, description, image })}
                  className="bg-white/90 hover:bg-white text-gray-600 hover:text-emerald-600 rounded-full p-1.5 shadow-sm transition-all duration-200"
                  title="Edit gear"
                >
                  <svg
                    className="w-3 h-3"
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
                  className="bg-white/90 hover:bg-white text-gray-600 hover:text-red-600 rounded-full p-1.5 shadow-sm transition-all duration-200"
                  title="Delete gear"
                >
                  <svg
                    className="w-3 h-3"
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
            </div>
          )}
        </div>
      )}

      {/* Content Section */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {title}
        </h3>

        {/* Availability Status */}
        <div className="mb-3">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              isAvailable
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full mr-2 ${
                isAvailable ? "bg-emerald-400" : "bg-red-400"
              }`}
            ></span>
            {isAvailable ? "Available" : "Unavailable"}
          </span>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-4 line-clamp-2">
          {description.length > 80
            ? `${description.substring(0, 80)}...`
            : description}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-auto">
          {!showActions && isAvailable && onRequestBorrow && (
            <button
              onClick={() => onRequestBorrow(id)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Request to Borrow
            </button>
          )}

          {showActions && (
            <div className="flex gap-2 w-full">
              {onEdit && (
                <button
                  onClick={() => onEdit({ id, title, description, image })}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 px-4 rounded-lg transition-colors duration-200"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(id)}
                  className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium py-2.5 px-4 rounded-lg transition-colors duration-200"
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
