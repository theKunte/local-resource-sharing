import { Link } from "react-router-dom";
import { useResourceContext } from "../context/ResourceContext";
import ResourceCard from "../components/ResourceCard";

export default function Home() {
  const { resources } = useResourceContext();

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
          {resources.length === 0 ? (
            <div className="text-gray-500 text-center col-span-2">
              No resources posted yet.
            </div>
          ) : (
            [...resources]
              .reverse()
              .map((res) => (
                <ResourceCard
                  key={res.id}
                  title={res.title}
                  description={res.description}
                  image={res.image}
                />
              ))
          )}
        </div>
      </section>
    </div>
  );
}
