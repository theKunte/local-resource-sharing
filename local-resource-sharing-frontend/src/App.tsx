import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home"; // Make sure Home.tsx is present
import PostResource from "./pages/PostResource"; // Optional
// import Login from "./pages/Login"; // Optional
import Header from "./components/Header"; // Optional but nice for navigation

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/post" element={<PostResource />} />
        {/* <Route path="/login" element={<Login />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
