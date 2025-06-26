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
  onDelete?: (id: string) => void;
  onEdit?: (gear: {
    id: string;
    title: string;
    description: string;
    image?: string;
  }) => void;
}

const GearCard: React.FC<GearCardProps> = ({
  id,
  title,
  description,
  image,
  onDelete,
  onEdit,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden group h-full flex flex-col">
      {/* Image Section */}
      {image && (
        <div className="relative w-full h-48 sm:h-52 md:h-56 overflow-hidden bg-gray-50">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Action buttons overlay */}
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {onEdit && (
              <button
                onClick={() => onEdit({ id, title, description, image })}
                className="bg-white/90 hover:bg-white text-emerald-600 hover:text-emerald-700 rounded-full p-2 shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110"
                title="Edit gear"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(id)}
                className="bg-white/90 hover:bg-white text-red-500 hover:text-red-600 rounded-full p-2 shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110"
                title="Delete gear"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        {/* Title */}
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 leading-tight line-clamp-2">
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-gray-600 text-sm sm:text-base leading-relaxed flex-1 mb-4">
          {description.length > 120 ? `${description.substring(0, 120)}...` : description}
        </p>
        
        {/* Footer with action buttons (for cards without images) */}
        {!image && (
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            {onEdit && (
              <button
                onClick={() => onEdit({ id, title, description, image })}
                className="text-emerald-600 hover:text-emerald-700 p-2 rounded-lg hover:bg-emerald-50 transition-colors duration-200"
                title="Edit gear"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(id)}
                className="text-red-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors duration-200"
                title="Delete gear"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
        
        {/* Gear tag/badge */}
        <div className="flex items-center justify-between mt-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <span className="mr-1">🎒</span>
            Available
          </span>
          {image && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {onEdit && (
                <button
                  onClick={() => onEdit({ id, title, description, image })}
                  className="text-emerald-600 hover:text-emerald-700 p-1 rounded transition-colors duration-200"
                  title="Edit gear"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(id)}
                  className="text-red-500 hover:text-red-600 p-1 rounded transition-colors duration-200"
                  title="Delete gear"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
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
