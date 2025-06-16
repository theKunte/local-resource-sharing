import { Link } from "react-router-dom";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";

function Header() {
  const { user, signOutUser } = useFirebaseAuth();
  return (
    <header className="bg-gradient-to-r from-blue-600 to-green-400 text-white shadow">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo and App Name */}
        <Link
          to="/"
          className="flex items-center gap-2 text-2xl font-extrabold tracking-tight drop-shadow tool-emoji"
        >
          <span role="img" aria-label="toolbox" className="emoji">
            🧰
          </span>
          <span className="hidden sm:inline">LocalToolShare</span>
        </Link>
        {/* Navigation Links */}
        <div className="flex flex-1 items-center ml-8">
          <div className="flex flex-row gap-10 items-center flex-1">
            <Link to="/" className="px-8 text-lg font-semibold transition mr-6">
              Home
            </Link>
            <Link
              to="/post"
              className="px-8 text-lg font-semibold hover:underline hover:text-green-200 transition"
            >
              Post Tool
            </Link>
          </div>
          <div className="flex-1"></div>
          {user ? (
            <>
              <Link
                to="/profile"
                className="px-8 text-lg font-semibold hover:underline hover:text-green-200 transition"
                style={{ marginLeft: "auto" }}
              >
                {user.displayName || user.email}
              </Link>
              <button
                onClick={signOutUser}
                className="ml-4 px-4 py-1 bg-red-500 hover:bg-red-600 rounded text-white font-semibold transition"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="px-8 text-lg font-semibold hover:underline hover:text-green-200 transition"
              style={{ marginLeft: "auto" }}
            >
              Login
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Header;
