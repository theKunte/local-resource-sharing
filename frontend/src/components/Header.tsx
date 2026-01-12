import { Link, useNavigate } from "react-router-dom";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";

function Header() {
  const { user, signOutUser } = useFirebaseAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to log out?")) {
      await signOutUser();
      navigate("/");
    }
  };

  return (
    <>
      <style>{`
        .desktop-nav {
          display: none;
        }
        @media (min-width: 1024px) {
          .desktop-nav {
            display: flex !important;
          }
        }
      `}</style>
      <header className="bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md sticky top-0 z-50">
        <nav className="w-full px-3 py-2 md:px-6 md:py-3">
          <div className="flex items-center justify-between">
            {/* Logo and App Name */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 fill-primary-600"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V7.3l7-3.11v8.8z" />
                </svg>
              </div>
              <span className="text-lg font-bold">GearShare</span>
            </Link>

            {/* Desktop Navigation - Hidden on mobile */}
            {user && (
              <div className="desktop-nav items-center gap-4">
                <Link
                  to="/"
                  className="text-white/90 hover:text-white hover:bg-white/15 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  Home
                </Link>
                <Link
                  to="/groups"
                  className="text-white/90 hover:text-white hover:bg-white/15 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  Groups
                </Link>
                <Link
                  to="/post"
                  className="text-white/90 hover:text-white hover:bg-white/15 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  Add Gear
                </Link>
                <Link
                  to="/my-gear"
                  className="text-white/90 hover:text-white hover:bg-white/15 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  My Gear
                </Link>
                <Link
                  to="/requests"
                  className="text-white/90 hover:text-white hover:bg-white/15 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  Requests
                </Link>
              </div>
            )}

            {/* User Avatar and Logout */}
            {user && (
              <div className="flex items-center gap-3">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-8 h-8 rounded-full border-2 border-white/30 object-cover"
                  />
                )}
                <button
                  onClick={handleLogout}
                  className="text-white/90 hover:text-white hover:bg-white/15 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                  title="Log out"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>
    </>
  );
}

export default Header;
