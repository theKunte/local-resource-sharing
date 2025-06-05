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
    <div className="relative bg-gradient-to-br from-blue-50 via-green-50 to-white border-2 border-blue-200 rounded-3xl shadow-xl p-6 sm:p-8 mb-4 flex flex-col gap-2 hover:scale-[1.02] hover:shadow-2xl transition-transform duration-200">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl select-none">🔧</span>
        <h3 className="text-xl font-bold text-blue-800 tracking-tight flex-1">{title}</h3>
      </div>
      {image && (
        <img src={image} alt={title} className="max-h-40 rounded-xl border border-gray-200 shadow mb-2 object-contain" style={{ maxWidth: '100%' }} />
      )}
      <p className="text-gray-700 text-base mb-2">{description}</p>
      <div className="absolute top-3 right-4 bg-green-200 text-green-800 px-3 py-1 rounded-full text-xs font-semibold shadow-sm select-none">
        Available
      </div>
    </div>
  );
};

export default ResourceCard;
