import { Link, useNavigate } from "react-router-dom";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { useActionableCount } from "../hooks/useActionableCount";

function Header() {
  const { user, signOutUser } = useFirebaseAuth();
  const navigate = useNavigate();
  const actionableCount = useActionableCount(user?.uid);

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
      <header className="bg-white/95 backdrop-blur-sm text-gray-800 shadow-md border-b border-gray-200 sticky top-0 z-50">
        <nav className="w-full px-3 py-2 md:px-6 md:py-3">
          <div className="flex items-center justify-between">
            {/* Logo and App Name */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 fill-white"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V7.3l7-3.11v8.8z" />
                </svg>
              </div>
              <span className="text-lg font-bold whitespace-nowrap">
                GearShare
              </span>
            </Link>

            {/* Desktop Navigation - Hidden on mobile */}
            {user && (
              <div className="desktop-nav items-center gap-4">
                <Link
                  to="/"
                  className="text-gray-600 hover:text-primary-600 hover:bg-gray-100 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  Home
                </Link>
                <Link
                  to="/groups"
                  className="text-gray-600 hover:text-primary-600 hover:bg-gray-100 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  Groups
                </Link>
                <Link
                  to="/post"
                  className="text-gray-600 hover:text-primary-600 hover:bg-gray-100 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  Add Gear
                </Link>
                <Link
                  to="/my-gear"
                  className="text-gray-600 hover:text-primary-600 hover:bg-gray-100 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  My Gear
                </Link>
                <Link
                  to="/requests"
                  className="relative text-gray-600 hover:text-primary-600 hover:bg-gray-100 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  Requests
                  {actionableCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </Link>
              </div>
            )}

            {/* User Avatar and Logout */}
            {user && (
              <div className="flex items-center gap-3">
                {user.photoURL && (
                  <Link to="/profile">
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      className="w-8 h-8 rounded-full border-2 border-gray-200 object-cover hover:border-primary-600 transition-colors"
                      referrerPolicy="no-referrer"
                    />
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-primary-600 hover:bg-gray-100 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
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
