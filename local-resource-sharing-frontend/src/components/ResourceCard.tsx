interface ResourceCardProps {
  title: string;
  description: string;
  postedBy?: string;
  postedAt?: string; // e.g. "2 days ago"
}

export default function ResourceCard({
  title,
  description,
  postedBy,
  postedAt,
}: ResourceCardProps) {
  return (
    <div className="bg-white rounded shadow p-6 hover:shadow-lg transition-shadow">
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      {(postedBy || postedAt) && (
        <div className="text-sm text-gray-500">
          {postedBy && <span>By {postedBy}</span>}
          {postedBy && postedAt && <span> • </span>}
          {postedAt && <span>{postedAt}</span>}
        </div>
      )}
    </div>
  );
}
