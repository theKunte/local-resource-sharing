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
}

const ResourceCard: React.FC<ResourceCardProps> = ({ title, description }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow p-6 mb-4">
      <h3 className="text-xl font-bold text-blue-800 mb-2">{title}</h3>
      <p className="text-gray-700 text-base">{description}</p>
    </div>
  );
};

export default ResourceCard;
