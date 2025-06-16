import React from "react";

export type Resource = {
  id: number;
  title: string;
  description: string;
  image?: string;
};

interface ResourceCardProps {
  id: number;
  title: string;
  description: string;
  image?: string;
  onDelete?: (id: number) => void;
  onEdit?: (resource: {
    id: number;
    title: string;
    description: string;
    image?: string;
  }) => void;
}

const ResourceCard: React.FC<ResourceCardProps> = ({
  id,
  title,
  description,
  image,
  onDelete,
  onEdit,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow p-6 mb-8 relative">
      <div className="absolute top-2 right-2 flex gap-2">
        {onEdit && (
          <button
            onClick={() => onEdit({ id, title, description, image })}
            className="text-blue-500 hover:text-blue-700 bg-white rounded-full p-1 shadow focus:outline-none"
            title="Edit"
          >
            <span aria-hidden="true">✎</span>
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(id)}
            className="text-red-500 hover:text-red-700 bg-white rounded-full p-1 shadow focus:outline-none"
            title="Delete"
          >
            <span aria-hidden="true">✕</span>
          </button>
        )}
      </div>
      <h3 className="text-xl font-bold text-blue-800 mb-2">{title}</h3>
      {image && (
        <img
          src={image}
          alt={title}
          className="max-h-40 rounded-xl border border-gray-200 shadow mb-2 object-contain"
          style={{ maxWidth: "100%" }}
        />
      )}
      <p className="text-gray-700 text-base">{description}</p>
    </div>
  );
};

export default ResourceCard;
