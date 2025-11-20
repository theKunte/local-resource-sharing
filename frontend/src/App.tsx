import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import PostResource from "./pages/PostResource";
import Header from "./components/Header";
import Profile from "./pages/Profile";
import Groups from "./pages/Groups";
import Requests from "./pages/Requests";
import GroupDetail from "./pages/GroupDetail";
import { useFirebaseAuth } from "./hooks/useFirebaseAuth";

function App() {
  const { user, loading } = useFirebaseAuth();

  console.log(
    "App render - loading:",
    loading,
    "user:",
    user?.email || "no user"
  );

  if (loading) {
    console.log("App: showing loading spinner");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  console.log(
    "App: rendering routes, user is:",
    user ? "authenticated" : "not authenticated"
  );

  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={user ? <Home /> : <Landing />} />
        <Route path="/post" element={<PostResource />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:groupId" element={<GroupDetail />} />
        <Route path="/requests" element={<Requests />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
