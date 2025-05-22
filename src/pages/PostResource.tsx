import { useState } from "react";

export default function PostResource() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ title, description });
    alert("Resource submitted!");
    setTitle("");
    setDescription("");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
        🛠️ Share a Tool
      </h1>

      <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-lg border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block mb-3 text-base font-medium text-gray-700">
              Tool Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g., Cordless Drill"
              className="w-full px-5 py-3 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block mb-3 text-base font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={6}
              placeholder="Briefly describe how it can be used and availability"
              className="w-full px-5 py-3 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition"
          >
            📤 Submit Tool
          </button>
        </form>
      </div>
    </div>
  );
}
