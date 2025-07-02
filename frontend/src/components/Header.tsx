import { Link } from "react-router-dom";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";

function Header() {
  const { user, signOutUser } = useFirebaseAuth();
  return (
    <header className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        {" "}
        {/* Logo and App Name */}
        <Link
          to="/"
          className="flex items-center gap-2 text-2xl font-extrabold tracking-tight drop-shadow tool-emoji"
        >
          <span role="img" aria-label="mountain adventure" className="emoji">
            �️
          </span>
          <span className="hidden sm:inline">GearShare</span>
        </Link>
        {/* Navigation Links - Only show for authenticated users */}
        {user ? (
          <div className="flex flex-1 items-center ml-8">
            {" "}
            <div className="flex flex-row gap-6 lg:gap-10 items-center flex-1">
              <Link
                to="/"
                className="px-4 lg:px-8 text-base lg:text-lg font-semibold transition hover:text-emerald-200"
              >
                Home
              </Link>
              <Link
                to="/post"
                className="px-4 lg:px-8 text-base lg:text-lg font-semibold hover:underline hover:text-emerald-200 transition"
              >
                Share Gear
              </Link>
              <Link
                to="/groups"
                className="px-4 lg:px-8 text-base lg:text-lg font-semibold hover:underline hover:text-emerald-200 transition"
              >
                Groups
              </Link>
            </div>
            <div className="flex-1"></div>
            <Link
              to="/profile"
              className="px-8 text-lg font-semibold hover:underline hover:text-emerald-200 transition"
              style={{ marginLeft: "auto" }}
            >
              {user.displayName || user.email}
            </Link>
            <button
              onClick={signOutUser}
              className="ml-4 px-4 py-1 bg-red-500 hover:bg-red-600 rounded text-white font-semibold transition shadow-md"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center">
            <span className="text-sm text-emerald-100">
              Sign in to share gear
            </span>
          </div>
        )}
      </nav>
    </header>
  );
}

export default Header;
