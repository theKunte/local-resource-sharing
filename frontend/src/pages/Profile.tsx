import { useEffect, useState } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ResourceCard from "../components/ResourceCard";
import { cropImageToSquare } from "../utils/cropImageToSquare";

export default function Profile() {
  const { user, loading } = useFirebaseAuth();
  const [resources, setResources] = useState<any[]>([]);
  const [groupAvatar, setGroupAvatar] = useState<string | ArrayBuffer | null>(
    null
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      axios
        .get(
          `http://localhost:3001/api/resources?ownerId=${encodeURIComponent(
            user.uid
          )}`
        )
        .then((res) => setResources(res.data));
    }
  }, [user]);

  // Delete resource handler
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this resource?"))
      return;
    await axios.delete(`http://localhost:3001/api/resources/${id}`);
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  // Edit resource handler
  const handleEdit = async (resource: any) => {
    const newTitle = prompt("Edit title:", resource.title);
    if (!newTitle) return;
    const newDescription = prompt("Edit description:", resource.description);
    if (!newDescription) return;
    const updated = await axios.put(
      `http://localhost:3001/api/resources/${resource.id}`,
      {
        title: newTitle,
        description: newDescription,
      }
    );
    setResources((prev) =>
      prev.map((r) => (r.id === resource.id ? { ...r, ...updated.data } : r))
    );
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="flex">
      {/* Sidebar */}
      <aside className="w-56 min-h-screen border-r border-gray-200 p-6 flex flex-col gap-4">
        <h2 className="text-xl font-bold mb-8">Local-Resource-Share</h2>
        <nav className="flex flex-col gap-2">
          <a href="/" className="hover:underline">
            Home
          </a>
          <a href="/post" className="hover:underline">
            Post A Resource
          </a>
          <a href="/find" className="hover:underline">
            Find Resource
          </a>
          <a href="/groups" className="hover:underline">
            Groups
          </a>
        </nav>
      </aside>
      {/* Main Content */}
      <main className="flex-1 p-10">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-8 mb-10">
          <div className="flex flex-col items-center md:items-start">
            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold mb-2 border">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="avatar"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span>Avatar</span>
              )}
            </div>
            <span className="text-lg font-semibold mt-2">
              {user.displayName || user.email}
            </span>
            <span className="text-gray-500 text-sm">Full Name</span>
          </div>
          <div className="flex-1 flex flex-col md:flex-row md:items-center gap-8 justify-between">
            <div className="flex flex-col gap-2 md:gap-4">
              <div className="flex gap-8 text-lg">
                <span>
                  <span className="font-bold">{resources.length}</span>{" "}
                  Resources
                </span>
                <span>
                  <span className="font-bold">0</span> Groups
                </span>
                <span>
                  <span className="font-bold">0</span> Shared
                </span>
              </div>
              <button className="text-blue-600 font-semibold hover:underline mt-2 md:mt-0">
                Edit Profile
              </button>
            </div>
          </div>
        </div>
        {/* Groups Row and Create Group */}
        <div className="flex gap-6 mb-8 items-center">
          {/* SeattleFriends group with avatar and upload */}
          <div className="flex flex-col items-center">
            <label
              htmlFor="group-avatar-upload"
              className="w-16 h-16 rounded-full bg-green-200 mb-2 flex items-center justify-center font-bold text-lg text-green-900 overflow-hidden cursor-pointer border-2 border-green-400 shadow"
              style={{ boxShadow: "0 0 0 2px #222" }}
            >
              <img
                src={typeof groupAvatar === "string" ? groupAvatar : undefined}
                alt="SeattleFriends Avatar"
                className={
                  groupAvatar
                    ? "w-full h-full object-cover rounded-full"
                    : "hidden"
                }
                style={{ aspectRatio: "1/1", objectFit: "cover" }}
              />
              {!groupAvatar && <span>SF</span>}
              <input
                id="group-avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const cropped = await cropImageToSquare(file, 128); // Match static avatar size
                  setGroupAvatar(cropped);
                }}
              />
            </label>
            <span className="text-xs text-gray-700 font-bold tracking-widest uppercase mt-1">
              SeattleFriends
            </span>
          </div>
          {/* Mock group 2 */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-blue-200 mb-2 flex items-center justify-center font-bold text-lg text-blue-900 overflow-hidden border-2 border-blue-400 shadow">
              <img
                src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=facearea&w=128&h=128&q=80"
                alt="Hiking Buddies"
                className="w-full h-full object-cover rounded-full"
                style={{ aspectRatio: "1/1", objectFit: "cover" }}
              />
            </div>
            <span className="text-xs text-gray-700 font-bold tracking-widest uppercase mt-1">
              Hiking Buddies
            </span>
          </div>
          {/* Mock group 3 */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-yellow-200 mb-2 flex items-center justify-center font-bold text-lg text-yellow-900 overflow-hidden border-2 border-yellow-400 shadow">
              <img
                src="https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=facearea&w=128&h=128&q=80"
                alt="Makers Club"
                className="w-full h-full object-cover rounded-full"
                style={{ aspectRatio: "1/1", objectFit: "cover" }}
              />
            </div>
            <span className="text-xs text-gray-700 font-bold tracking-widest uppercase mt-1">
              Makers Club
            </span>
          </div>
          {/* Create Group Button */}
          <button
            className="flex flex-col items-center focus:outline-none"
            onClick={() => {
              const name = prompt("Enter group name:");
              if (!name || !user) return;
              fetch("http://localhost:3001/api/groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, createdById: user.uid }),
              })
                .then((res) => res.json())
                .then((group) => alert(`Group '${group.name}' created!`))
                .catch(() => alert("Failed to create group."));
            }}
            title="Create Group"
          >
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl mb-2 border-2 border-gray-400 shadow">
              +
            </div>
            <span className="text-xs text-gray-700 font-bold tracking-widest uppercase mt-1">
              New
            </span>
          </button>
        </div>
        <hr className="mb-8" />
        {/* Posted Resources Grid */}
        <div className="grid grid-cols-3 gap-8">
          {resources.length === 0 ? (
            <div className="text-gray-500 col-span-full">
              You haven't posted any resources yet.
            </div>
          ) : (
            resources.map((res) => (
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
      </main>
    </div>
  );
}
