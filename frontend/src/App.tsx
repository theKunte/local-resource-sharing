import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import FloatingActionButton from "./components/FloatingActionButton";
import BottomNavigation from "./components/BottomNavigation";
import { useFirebaseAuth } from "./hooks/useFirebaseAuth";
import { useSessionTimeout } from "./hooks/useSessionTimeout";

function App() {
  const { user, loading } = useFirebaseAuth();

  // Enable session timeout (5 min of inactivity)
  const { showWarning, extendSession, logout } = useSessionTimeout();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Header />
      {showWarning && (
        <SessionWarning onExtend={extendSession} onSignOut={logout} />
      )}
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
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
    </BrowserRouter>
  );
}

export default App;
