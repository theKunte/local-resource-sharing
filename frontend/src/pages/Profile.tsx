import { useEffect, useState } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import axios from "axios";
import ResourceCard from "../components/ResourceCard";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, loading } = useFirebaseAuth();
  const [resources, setResources] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      // Fetch resources for this user (by email or uid)
      axios
        .get(`http://localhost:3001/api/resources?user=${encodeURIComponent(user.email || user.uid)}`)
        .then((res) => setResources(res.data));
    }
  }, [user]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center gap-6 mb-8">
        {user.photoURL && (
          <img src={user.photoURL} alt="avatar" className="w-20 h-20 rounded-full border" />
        )}
        <div>
          <h2 className="text-2xl font-bold">{user.displayName || user.email}</h2>
          <p className="text-gray-500">Profile</p>
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-4">Your Posted Resources</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.length === 0 ? (
          <div className="text-gray-500 col-span-full">You haven't posted any resources yet.</div>
        ) : (
          resources.map((res) => (
            <ResourceCard
              key={res.id}
              id={res.id}
              title={res.title}
              description={res.description}
              image={res.image}
            />
          ))
        )}
      </div>
    </div>
  );
}
