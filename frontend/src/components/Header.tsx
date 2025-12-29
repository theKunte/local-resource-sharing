import { Link } from "react-router-dom";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { useEffect, useRef, useState } from "react";

function Header() {
  const { user, signOutUser, signInWithGoogle } = useFirebaseAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileRef = useRef<HTMLDivElement | null>(null);

  // Close dropdowns on outside click or escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        mobileOpen &&
        mobileRef.current &&
        !mobileRef.current.contains(e.target as Node)
      ) {
        setMobileOpen(false);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [mobileOpen]);

  // Auto-close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (mobileOpen && window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileOpen]);

  return (
    <header className="bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-xl sticky top-0 z-50 backdrop-blur-sm">
      <nav className="w-full px-4 sm:px-6 lg:px-8">
        <div
          className="flex items-center justify-between"
          // style={{ minHeight: "5rem" }}
        >
          {/* Desktop Navigation */}
          {user && (
            <div className="flex items-center gap-8">
              <Link
                to="/"
                className="text-white/90 hover:text-white hover:bg-white/15 px-4 py-2.5 rounded-lg text-base font-semibold transition-all duration-200 hover:shadow-md"
              >
                Explore
              </Link>
              <Link
                to="/my-gear"
                className="text-white/90 hover:text-white hover:bg-white/15 px-4 py-2.5 rounded-lg text-base font-semibold transition-all duration-200 hover:shadow-md"
              >
                My Gear
              </Link>
              <Link
                to="/groups"
                className="text-white/90 hover:text-white hover:bg-white/15 px-4 py-2.5 rounded-lg text-base font-semibold transition-all duration-200 hover:shadow-md"
              >
                Groups
              </Link>
              <Link
                to="/requests"
                className="text-white/90 hover:text-white hover:bg-white/15 px-4 py-2.5 rounded-lg text-base font-semibold transition-all duration-200 hover:shadow-md"
              >
                Requests
              </Link>
            </div>
          )}

          {/* Right side - Auth / Profile */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User avatar"}
                    className="w-8 h-8 rounded-full border-2 border-white/20 object-cover"
                  />
                )}
                <button
                  onClick={signOutUser}
                  className="text-white/90 hover:text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Dropdown Menu */}
      {mobileOpen && user && (
        <div
          className="md:hidden absolute top-full right-0 w-64 bg-white shadow-lg border border-gray-200 rounded-bl-lg z-40"
          ref={mobileRef}
        >
          <div className="px-4 py-6 space-y-3">
            <Link
              to="/"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Explore
            </Link>
            <Link
              to="/my-gear"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              My Gear
            </Link>
            <Link
              to="/groups"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Groups
            </Link>
            <Link
              to="/requests"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Requests
            </Link>
            <Link
              to="/post"
              className="block px-3 py-2 rounded-md text-base font-medium bg-[#C57B57] text-white hover:bg-[#C57B57]/90 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              + Share Gear
            </Link>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="px-3 py-2 text-sm text-gray-600">
                {user.displayName || user.email}
              </div>
              <button
                onClick={() => {
                  signOutUser();
                  setMobileOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
