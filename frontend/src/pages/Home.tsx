import { useEffect, useState } from "react";
import axios from "axios";
import ResourceCard from "../components/ResourceCard";
import { Link } from "react-router-dom";

type Resource = {
  id: number;
  title: string;
  description: string;
  image?: string;
};

export default function Home() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [editResource, setEditResource] = useState<Resource | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    axios
      .get<Resource[]>("http://localhost:3001/api/resources")
      .then((res) => setResources(res.data));
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this resource?")) return;
    try {
      await axios.delete(`http://localhost:3001/api/resources/${id}`);
      setResources((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert("Failed to delete resource.");
    }
  };

  const handleEdit = (resource: Resource) => {
    setEditResource(resource);
    setEditTitle(resource.title);
    setEditDescription(resource.description);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editResource) return;
    setEditSubmitting(true);
    try {
      const res = await axios.put(
        `http://localhost:3001/api/resources/${editResource.id}`,
        {
          title: editTitle,
          description: editDescription,
          image: editResource.image, // keep existing image
        }
      );
      setResources((prev) =>
        prev.map((r) => (r.id === editResource.id ? res.data : r))
      );
      setEditResource(null);
    } catch {
      alert("Failed to update resource.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleEditCancel = () => {
    setEditResource(null);
  };

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.length === 0 ? (
            <div className="text-gray-500 text-center col-span-full">
              No resources posted yet.
            </div>
          ) : (
            [...resources]
              .reverse()
              .map((res) => (
                <ResourceCard
                  key={res.id}
                  id={res.id}
                  title={res.title}
                  description={res.description}
                  image={res.image}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))
          )}
        </div>
      </section>

      {/* Edit Modal */}
      {editResource && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={handleEditCancel}
              title="Close"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4 text-center">Edit Resource</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                  rows={4}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                  disabled={editSubmitting}
                >
                  {editSubmitting ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
                  onClick={handleEditCancel}
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
