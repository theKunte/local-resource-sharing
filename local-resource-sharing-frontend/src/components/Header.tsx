import { Link } from "react-router-dom";

function Header() {
  return (
    <header className="bg-blue-700 text-white shadow">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Left: Logo and Nav */}
        <div className="flex items-center space-x-6">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            🛠️ LocalToolShare
          </Link>
          <Link to="/" className="hover:underline">
            Home
          </Link>
          <Link to="/post" className="hover:underline">
            Post Tool
          </Link>
        </div>

        {/* Right: Login */}
        <div>
          <Link to="/login" className="hover:underline">
            Login
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default Header;
