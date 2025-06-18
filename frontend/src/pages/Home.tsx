import { useEffect, useState } from "react";
import axios from "axios";
import ResourceCard from "../components/ResourceCard";
import { Link } from "react-router-dom";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";

export default function Home() {
  const { user, loading, signInWithGoogle } = useFirebaseAuth();
  const [resources, setResources] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  useEffect(() => {
    if (user) {
      setLoadingResources(true);
      axios
        .get(
          `http://localhost:3001/api/resources?ownerId=${encodeURIComponent(
            user.uid
          )}`
        )
        .then((res) => setResources(res.data))
        .finally(() => setLoadingResources(false));
    }
  }, [user]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Hero Section */}
      <section className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Local Resource Sharing
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto mb-6">
          Find and share helpful community resources — from tools and tutoring
          to clothing drives and more. Sign in to post and manage your own
          resources!
        </p>
        {!user ? (
          <button
            onClick={signInWithGoogle}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
          >
            Sign in with Google
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt="avatar"
                className="w-20 h-20 rounded-full border shadow mb-2"
              />
            )}
            <div className="text-center">
              <div className="font-semibold text-lg">
                {user.displayName || user.email}
              </div>
            </div>
            <Link to="/post">
              <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition">
                Post a Resource
              </button>
            </Link>
          </div>
        )}
      </section>

      {/* User's Resources */}
      {user && (
        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-left">
            Your Posted Resources
          </h2>
          {loadingResources ? (
            <div className="text-gray-500 text-center">
              Loading your resources...
            </div>
          ) : resources.length === 0 ? (
            <div className="text-gray-500 text-center">
              You haven't posted any resources yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map((res) => (
                <ResourceCard
                  key={res.id}
                  id={res.id}
                  title={res.title}
                  description={res.description}
                  image={res.image}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
