import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import PostResource from "./pages/PostResource";
import Header from "./components/Header";
import Profile from "./pages/Profile";

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/post" element={<PostResource />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
