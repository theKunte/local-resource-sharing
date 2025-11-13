import { Link } from "react-router-dom";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { useEffect, useRef, useState } from "react";

function Header() {
  const { user, signOutUser } = useFirebaseAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click / escape
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <header className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 group"
          aria-label="Go to home"
        >
          <div className="w-10 h-10 rounded-full bg-white/15 group-hover:bg-white/25 backdrop-blur-sm flex items-center justify-center font-black text-xl tracking-tight shadow-inner">
            G
          </div>
          <span className="font-extrabold text-2xl tracking-tight hidden sm:inline select-none">
            Gearo
          </span>
        </Link>
        {/* User Menu */}
        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              aria-haspopup="true"
              aria-expanded={open}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="avatar"
                  className="w-9 h-9 rounded-full object-cover border border-white/30 shadow"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold">
                  {(user.displayName || user.email || "U")
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
              <span className="font-semibold max-w-[140px] truncate">
                {user.displayName || user.email}
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
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
          <div className="text-sm text-white/80">Sign in to share gear</div>
        )}
      </nav>
    </header>
  );
}

export default Header;
