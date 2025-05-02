import { Link } from "react-router-dom";

function Header() {
  return (
    <header className="bg-blue-600 text-white p-4">
      <nav className="flex justify-between items-center max-w-4xl mx-auto">
        <h1 className="text-xl font-bold">LocalShare</h1>
        <div className="space-x-4">
          <Link to="/" className="hover:underline">
            Home
          </Link>
          <Link to="/post" className="hover:underline">
            Post
          </Link>
          <Link to="/login" className="hover:underline">
            Login
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default Header;
