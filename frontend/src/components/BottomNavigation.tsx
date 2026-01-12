import { Link, useLocation } from "react-router-dom";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";

function BottomNavigation() {
  const location = useLocation();
  const { user } = useFirebaseAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Don't render if user is not logged in
  if (!user) {
    return null;
  }

  const navItems = [
    {
      path: "/",
      label: "Home",
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 ${active ? "fill-primary-600" : "fill-gray-600"}`}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
    },
    {
      path: "/groups",
      label: "Groups",
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 ${active ? "fill-primary-600" : "fill-gray-600"}`}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
      ),
    },
    {
      path: "/post",
      label: "Add",
      icon: (active: boolean) => (
        <svg
          className={`w-6 h-6 ${active ? "fill-white" : "fill-white"}`}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      ),
      isSpecial: true,
    },
    {
      path: "/my-gear",
      label: "My Gear",
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 ${active ? "fill-primary-600" : "fill-gray-600"}`}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
        </svg>
      ),
    },
    {
      path: "/requests",
      label: "Requests",
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 ${active ? "fill-primary-600" : "fill-gray-600"}`}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M21 8V7l-3 2-3-2v1l3 2 3-2zm1-5H2C.9 3 0 3.9 0 5v14c0 1.1.9 2 2 2h20c1.1 0 1.99-.9 1.99-2L24 5c0-1.1-.9-2-2-2zM8 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H2v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1zm8-6h-8V6h8v6z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <style>{`
        @media (min-width: 1024px) {
          .mobile-bottom-nav {
            display: none !important;
          }
        }
      `}</style>
      <nav
        className="mobile-bottom-nav fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg"
        style={{
          zIndex: 99999,
          position: "fixed",
          bottom: 0,
          height: "48px",
        }}
      >
        <div className="flex justify-between items-center h-12 px-3 max-w-md mx-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);

            if (item.isSpecial) {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center justify-center -mt-4"
                >
                  <div className="bg-primary-600 rounded-full p-2 shadow-lg hover:bg-primary-700 transition-colors">
                    {item.icon(active)}
                  </div>
                  <span className="text-[9px] mt-0.5 text-gray-600">
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center min-w-[56px] h-full hover:bg-gray-50 transition-colors"
              >
                {item.icon(active)}
                <span
                  className={`text-[9px] mt-0.5 ${
                    active ? "text-primary-600 font-semibold" : "text-gray-600"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export default BottomNavigation;
