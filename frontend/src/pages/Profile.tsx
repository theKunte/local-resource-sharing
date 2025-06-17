import { useEffect, useState } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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
        <div className="flex gap-8 mb-8 items-center">
          {/* Mock group with avatar and upload */}
          <div className="flex flex-col items-center">
            <label
              htmlFor="group-avatar-upload"
              className="w-16 h-16 rounded-full bg-green-200 mb-2 flex items-center justify-center font-bold text-lg text-green-900 overflow-hidden cursor-pointer border-2 border-green-400"
            >
              <img
                src={groupAvatar || undefined}
                alt="SeattleFriends Avatar"
                className={
                  groupAvatar ? "w-full h-full object-cover" : "hidden"
                }
              />
              {!groupAvatar && <span>SF</span>}
              <input
                id="group-avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onloadend = () =>
                    setGroupAvatar(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            <span className="text-sm text-gray-700">SeattleFriends</span>
          </div>
          {[1, 2, 3, 4].map((g) => (
            <div key={g} className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gray-200 mb-2" />
              <span className="text-sm text-gray-700">Group Name</span>
            </div>
          ))}
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
            <div className="w-16 h-16 rounded-full bg-blue-200 flex items-center justify-center text-2xl mb-2">
              +
            </div>
            <span className="text-sm text-blue-700 font-semibold">
              Create Group
            </span>
          </button>
        </div>
        <hr className="mb-8" />
        {/* Posted Resources Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {resources.length === 0 ? (
            <div className="text-gray-500 col-span-full">
              You haven't posted any resources yet.
            </div>
          ) : (
            resources.map((res) => (
              <div
                key={res.id}
                className="bg-gray-200 rounded-lg h-32 flex items-center justify-center font-semibold text-gray-700"
              >
                {res.title}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
