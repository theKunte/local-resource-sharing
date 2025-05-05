import { Link } from "react-router-dom";

function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <nav className="flex justify-between items-center max-w-6xl mx-auto px-6 py-4">
        <Link
          to="/"
          className="text-2xl font-bold text-blue-600 tracking-tight"
        >
          Local<span className="text-gray-800">Share</span>
        </Link>
        <div className="flex gap-4">
          <Link
            to="/"
            className="text-gray-700 hover:text-blue-600 transition font-medium"
          >
            Home
          </Link>
          <Link
            to="/post"
            className="bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition"
          >
            Post Resource
          </Link>
          <Link
            to="/login"
            className="text-gray-700 hover:text-blue-600 transition font-medium"
          >
            Login
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default Header;
