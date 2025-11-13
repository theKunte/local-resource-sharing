import { Link } from "react-router-dom";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { useEffect, useRef, useState } from "react";

function Header() {
  const { user, signOutUser, signInWithGoogle } = useFirebaseAuth();
  const [open, setOpen] = useState(false); // profile dropdown
  const [mobileOpen, setMobileOpen] = useState(false); // hamburger menu
  const menuRef = useRef<HTMLDivElement | null>(null);
  const mobileRef = useRef<HTMLDivElement | null>(null);

  // Close dropdowns on outside click / escape
  useEffect(() => {
    if (!open && !mobileOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        open &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
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
        setOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, mobileOpen]);

  // Auto-close mobile panel when switching to desktop breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (mobileOpen && window.innerWidth >= 640) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileOpen]);

  return (
    <header className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between p-40">
        {/* Mobile: logo/login centered, hamburger on right (avatar removed) */}
        <div className="flex items-center w-full sm:hidden">
          {/* Center: logo or login */}
          <div className="flex-1 flex justify-center p-20">
            {user ? (
              <Link
                to="/"
                className="flex items-center gap-2"
                onClick={() => setMobileOpen(false)}
              >
                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center font-black text-lg">
                  G
                </div>
                <span className="font-bold text-xl select-none">Gearo</span>
              </Link>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 font-semibold text-sm"
              >
                Login
              </button>
            )}
          </div>
          {/* Right: enlarged hamburger, nudged left by extra right margin */}
          <div className="flex items-center" ref={menuRef}>
            <button
              aria-label="Toggle navigation menu"
              onClick={() => setMobileOpen((o) => !o)}
              className="p-3 mr-2 rounded-lg bg-white/15 hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition-colors"
              style={{ marginRight: "0.5rem" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-7 h-7"
              >
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        {/* Desktop: logo left, profile dropdown right */}
        <div className="hidden sm:flex w-full items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 group"
            aria-label="Go to home"
          >
            <div className="w-10 h-10 rounded-full bg-white/15 group-hover:bg-white/25 backdrop-blur-sm flex items-center justify-center font-black text-xl tracking-tight shadow-inner"></div>
            <span className="font-extrabold text-2xl tracking-tight hidden md:inline select-none">
              Gearo
            </span>
          </Link>
          {user ? (
            <div className="relative" ref={menuRef}>
              {open && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden bg-white text-slate-800 shadow-lg border border-slate-200 animate-fade-in"
                  role="menu"
                >
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-medium truncate">
                      {user.displayName || user.email}
                    </p>
                    <p className="text-xs text-slate-500 truncate">Signed in</p>
                  </div>
                  <ul className="py-1 text-sm" aria-label="User navigation">
                    <li>
                      <Link
                        to="/profile"
                        className="block px-4 py-2 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                      >
                        Profile
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/post"
                        className="block px-4 py-2 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                      >
                        Share Gear
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/groups"
                        className="block px-4 py-2 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                      >
                        Groups
                      </Link>
                    </li>
                    <li className="border-t border-slate-100 mt-1">
                      <button
                        onClick={() => {
                          setOpen(false);
                          signOutUser();
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-red-50 focus:bg-red-50 text-red-600 font-medium focus:outline-none"
                        role="menuitem"
                      >
                        Logout
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 font-semibold text-sm"
            >
              Login
            </button>
          )}
        </div>
      </nav>
      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="sm:hidden relative z-40" ref={mobileRef}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          {/* Left-side slide-out panel (reverted from right) */}
          <div className="fixed top-0 right-64 h-full bg-white text-slate-800 shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <span className="font-bold text-lg">Menu</span>
              <button
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-md hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              <ul className="space-y-1">
                <li>
                  <Link
                    to="/"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2 rounded-md hover:bg-emerald-50"
                  >
                    Browse Gear
                  </Link>
                </li>
                {user && (
                  <li>
                    <Link
                      to="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-2 rounded-md hover:bg-emerald-50"
                    >
                      My Gear
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    to="/requests"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2 rounded-md hover:bg-emerald-50"
                  >
                    Requests
                  </Link>
                </li>
                <li>
                  <Link
                    to="/groups"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2 rounded-md hover:bg-emerald-50"
                  >
                    Groups
                  </Link>
                </li>
              </ul>
            </nav>
            <div className="px-4 py-4 border-t border-slate-200">
              {user ? (
                <button
                  onClick={() => {
                    signOutUser();
                    setMobileOpen(false);
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold text-sm"
                >
                  Logout
                </button>
              ) : (
                <button
                  onClick={() => {
                    signInWithGoogle();
                    setMobileOpen(false);
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-sm"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
