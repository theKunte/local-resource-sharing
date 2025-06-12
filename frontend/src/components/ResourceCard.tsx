import React from "react";

export type Resource = {
  id: number;
  title: string;
  description: string;
  image?: string;
};

interface ResourceCardProps {
  title: string;
  description: string;
  image?: string;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ title, description, image }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow p-6 mb-4">
      <h3 className="text-xl font-bold text-blue-800 mb-2">{title}</h3>
      {image && (
        <img
          src={image}
          alt={title}
          className="max-h-40 rounded-xl border border-gray-200 shadow mb-2 object-contain"
          style={{ maxWidth: '100%' }}
        />
      )}
      <p className="text-gray-700 text-base">{description}</p>
    </div>
  );
};

export default ResourceCard;
