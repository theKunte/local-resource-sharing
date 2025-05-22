import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic here
    alert(`Logging in with\nEmail: ${email}\nPassword: ${password}`);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="max-w-md w-full bg-white border-2 border-blue-400 rounded-2xl shadow-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Login to LocalToolShare
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block mb-1 font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 bg-white"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block mb-1 font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 bg-white"
              placeholder="Your password"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}
