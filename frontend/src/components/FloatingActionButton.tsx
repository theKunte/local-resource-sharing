import { Link } from "react-router-dom";

export default function FloatingActionButton() {
  return (
    <Link
      to="/post"
      className="fixed bottom-6 right-6 z-40 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 group"
      aria-label="Share Gear"
    >
      <svg
        className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
      <span className="sr-only">Share Gear</span>
    </Link>
  );
}
