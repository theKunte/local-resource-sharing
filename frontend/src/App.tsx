import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import PostResource from "./pages/PostResource";
import Header from "./components/Header";
import Profile from "./pages/Profile";
import Groups from "./pages/Groups";
import Requests from "./pages/Requests";
import GroupDetail from "./pages/GroupDetail";

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
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
