import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Replace with real authentication logic
    alert(`Logging in with\nEmail: ${email}\nPassword: ${password}`);
    // On success: navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-blue-100 py-12 px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg">
        <form
          onSubmit={handleSubmit}
          className="space-y-7"
        >
          <h2 className="text-2xl font-bold text-center text-blue-900 mb-6">
            Login to Local Tool Share
          </h2>
          <div>
            <label htmlFor="email" className="block font-semibold text-blue-800 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2 border-2 border-blue-100 rounded-xl focus:border-blue-400 focus:outline-none transition bg-blue-50 placeholder-blue-300"
              placeholder="you@email.com"
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="password" className="block font-semibold text-blue-800 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2 border-2 border-blue-100 rounded-xl focus:border-blue-400 focus:outline-none transition bg-blue-50 placeholder-blue-300 pr-10"
                placeholder="Your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600 text-xl focus:outline-none"
                onClick={() => setShowPassword(s => !s)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 text-lg bg-gradient-to-r from-blue-400 to-green-400 text-white font-bold rounded-xl shadow hover:from-green-400 hover:to-blue-400 transition"
          >
            Log In
          </button>
          <div className="text-center mt-4 text-blue-700">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="font-bold underline hover:text-green-500">
              Sign Up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
