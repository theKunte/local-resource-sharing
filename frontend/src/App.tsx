import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import PostResource from "./pages/PostResource";
import Header from "./components/Header";
import Profile from "./pages/Profile";
import Groups from "./pages/Groups";
import Requests from "./pages/Requests";
import GroupDetail from "./pages/GroupDetail";
import MyGear from "./pages/MyGear";
import SessionWarning from "./components/SessionWarning";
import BottomNavigation from "./components/BottomNavigation";
import { useFirebaseAuth } from "./hooks/useFirebaseAuth";
import { useSessionTimeout } from "./hooks/useSessionTimeout";
import { useNotifications } from "./hooks/useNotifications";

function App() {
  const { user, loading } = useFirebaseAuth();
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  // Enable session timeout (5 min of inactivity)
  const { showWarning, extendSession, logout } = useSessionTimeout();

  // Initialize push notifications when user is logged in
  useNotifications(user?.uid);

  // Check for Firebase initialization errors
  useEffect(() => {
    const error = sessionStorage.getItem("firebase_init_error");
    if (error) {
      setFirebaseError(error);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Show Firebase initialization error
  if (firebaseError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
            Authentication Error
          </h2>
          <p className="text-gray-600 text-center mb-6">{firebaseError}</p>
          <button
            onClick={() => {
              sessionStorage.removeItem("firebase_init_error");
              window.location.reload();
            }}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Header />
        {showWarning && (
          <SessionWarning onExtend={extendSession} onSignOut={logout} />
        )}
        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          <Routes>
            <Route path="/" element={user ? <Home /> : <Landing />} />
            <Route path="/my-gear" element={<MyGear />} />
            <Route path="/post" element={<PostResource />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:groupId" element={<GroupDetail />} />
            <Route path="/requests" element={<Requests />} />
          </Routes>
        </main>
        <BottomNavigation />
      </div>
    </BrowserRouter>
  );
}

export default App;
