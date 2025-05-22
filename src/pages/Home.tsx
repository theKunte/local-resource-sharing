import React from "react";
import { Link } from "react-router-dom";

const resources = [
  {
    id: 1,
    title: "Free Tutoring - Grade 10 Math",
    description: "Volunteer offering online help on weekday evenings.",
  },
  {
    id: 2,
    title: "Gently Used Winter Coats",
    description: "Available for pickup near downtown community center.",
  },
  {
    id: 3,
    title: "Job Mentorship - IT Field",
    description: "Professional offering 1:1 career guidance for juniors.",
  },
];

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Hero */}
      <section className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Local Resource Sharing
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Find and share helpful community resources — from tutoring and
          clothing drives to job mentorship and more.
        </p>
        <Link to="/post">
          <button className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition">
            Post a Resource
          </button>
        </Link>
      </section>

      {/* Resource List Preview */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Latest Shared Resources
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {resources.map((res) => (
            <div
              key={res.id}
              className="bg-white border border-gray-200 p-4 rounded-md shadow-sm hover:shadow-md transition"
            >
              <h3 className="text-lg font-semibold text-gray-900">
                {res.title}
              </h3>
              <p className="text-gray-600 text-sm mt-1">{res.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
