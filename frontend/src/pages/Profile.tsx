import { useEffect, useState, useCallback } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ResourceCard from "../components/ResourceCard";
import ManageGroupsModal from "../components/ManageGroupsModal";
// removed cropImageToSquare (no longer used)

interface ResourceItem {
  id: string;
  title: string;
  description: string;
  image?: string | null;
}

interface GroupItem {
  id: string;
  name: string;
  avatar?: string | null;
}

export default function Profile() {
  const { user, loading } = useFirebaseAuth();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const navigate = useNavigate();
  const [manageResourceId, setManageResourceId] = useState<string | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);

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

  // helper to load groups (used after creating a new group)
  const loadGroups = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(
        `http://localhost:3001/api/groups?userId=${encodeURIComponent(
          user.uid
        )}`
      );
      setGroups(res.data);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
      setGroups([]);
    }
  }, [user]);

  // Fetch groups the user belongs to
  useEffect(() => {
    if (!user) return;
    loadGroups();
  }, [user, loadGroups]);

  // Delete resource handler
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this resource?"))
      return;
    await axios.delete(`http://localhost:3001/api/resources/${id}`, {
      data: { userId: user?.uid },
    });
    setResources((prev) => prev.filter((r) => r.id !== id));
    // notify other pages that a resource was deleted
    try {
      window.dispatchEvent(
        new CustomEvent("resource:deleted", { detail: { id } })
      );
    } catch (_err) {
      console.debug("[Profile] dispatch resource:deleted failed", _err);
    }
  };

  // Edit resource handler
  const handleEdit = async (resource: ResourceItem) => {
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
    // notify other pages that a resource was updated
    try {
      window.dispatchEvent(
        new CustomEvent("resource:updated", {
          detail: { resource: updated.data },
        })
      );
    } catch (_err) {
      console.debug("[Profile] dispatch resource:updated failed", _err);
    }
  };

  // helper to shorten long group names for display
  const truncate = (s: string | undefined, n = 18) => {
    if (!s) return "";
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  };

  // Create group via modal form
  const createGroup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newGroupName || !user) return;
    try {
      setCreatingGroup(true);
      const res = await axios.post("http://localhost:3001/api/groups", {
        name: newGroupName.trim(),
        createdById: user.uid,
      });
      await loadGroups();
      setShowCreateModal(false);
      setNewGroupName("");
      alert(`Group '${res.data.name}' created!`);
    } catch (err) {
      console.error("Failed to create group:", err);
      alert("Failed to create group.");
    } finally {
      setCreatingGroup(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="flex">
      {/* Sidebar */}

      {/* Main Content */}
      <main className="flex-1 p-10">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-8 mb-10">
          <div className="flex flex-col items-center md:items-start"></div>
          <div className="flex-1 flex flex-col md:flex-row md:items-center gap-8 justify-between">
            <div className="flex flex-col gap-2 md:gap-4">
              <div className="flex gap-8 text-lg">
                <span>
                  <span className="font-bold">{resources.length}</span>{" "}
                  Resources
                </span>
                <span>
                  <span className="font-bold">{groups.length}</span> Groups
                </span>
                <span>
                  <span className="font-bold">0</span> Shared
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Groups Row and Create Group */}
        {/* Groups Row: horizontal scroll on small screens, grid on md+ */}
        <div className="mb-8">
          {/* Small screens: horizontal scroll */}
          <div className="flex gap-6 items-center overflow-x-auto py-2 md:hidden">
            {groups.length === 0 ? (
              <div className="text-gray-500">
                You are not a member of any groups yet.
              </div>
            ) : (
              groups.map((g) => (
                <div
                  key={g.id}
                  className="flex flex-col items-center min-w-[72px]"
                >
                  <div
                    className="w-16 h-16 rounded-full bg-gray-200 mb-2 flex items-center justify-center font-bold text-lg overflow-hidden border-2 shadow cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => navigate(`/groups/${g.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        navigate(`/groups/${g.id}`);
                    }}
                    title={`Open ${g.name}`}
                  >
                    {g.avatar ? (
                      <img
                        src={g.avatar}
                        alt={`${g.name} Avatar`}
                        className="w-full h-full object-cover rounded-full"
                        style={{ aspectRatio: "1/1", objectFit: "cover" }}
                      />
                    ) : (
                      <span>
                        {g.name
                          .split(" ")
                          .map((s: string) => s[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-700 font-bold tracking-widest uppercase mt-1">
                    {truncate(g.name)}
                  </span>
                </div>
              ))
            )}

            {/* Create button in the scroll area */}
            <div className="flex flex-col items-center ml-4">
              <button
                className="w-16 h-16 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-2xl mb-2 border-2 border-emerald-600 shadow text-white"
                onClick={() => setShowCreateModal(true)}
                title="Create Group"
              >
                +
              </button>
              <span className="text-xs text-white font-bold tracking-widest uppercase mt-1">
                New
              </span>
            </div>
          </div>

          {/* Medium+ screens: grid */}
          <div className="hidden md:grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {groups.length === 0 ? (
              <div className="text-gray-500 col-span-full">
                You are not a member of any groups yet.
              </div>
            ) : (
              groups.map((g) => (
                <div key={g.id} className="flex flex-col items-center">
                  <div
                    className="w-20 h-20 rounded-full bg-gray-200 mb-2 flex items-center justify-center font-bold text-lg overflow-hidden border-2 shadow cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => navigate(`/groups/${g.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        navigate(`/groups/${g.id}`);
                    }}
                    title={`Open ${g.name}`}
                  >
                    {g.avatar ? (
                      <img
                        src={g.avatar}
                        alt={`${g.name} Avatar`}
                        className="w-full h-full object-cover rounded-full"
                        style={{ aspectRatio: "1/1", objectFit: "cover" }}
                      />
                    ) : (
                      <span>
                        {g.name
                          .split(" ")
                          .map((s: string) => s[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-700 font-bold tracking-widest uppercase mt-1">
                    {truncate(g.name)}
                  </span>
                </div>
              ))
            )}

            {/* Create button in the grid */}
            <div className="flex flex-col items-center">
              <button
                className="w-20 h-20 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-2xl mb-2 border-2 border-emerald-600 shadow text-white"
                onClick={() => setShowCreateModal(true)}
                title="Create Group"
              >
                +
              </button>
              <span className="text-xs text-white font-bold tracking-widest uppercase mt-1">
                New
              </span>
            </div>
          </div>
        </div>
        <hr className="mb-6" />

        {/* Create Group Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
            {/* backdrop layer grays out the page */}
            <div className="absolute inset-0 bg-black/60 " />
            {/* outer decorative ring (above backdrop) */}
            <div className="relative z-10 rounded-xl p-2 bg-gradient-to-br from-emerald-100/40 to-white/60">
              {/* white panel centered */}
              <div className="bg-white rounded-x p-6 w-full max-w-md">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-600 text-white text-xl font-bold mb-3">
                    👥
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Create a New Group
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Give your group a name and invite friends later.
                  </p>
                </div>
                <form onSubmit={createGroup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="e.g., Seattle Hiking Friends"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={creatingGroup}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      {creatingGroup ? "Creating..." : "Create Group"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setNewGroupName("");
                      }}
                      className="px-4 py-3 bg-gray-300 hover:bg-gray-350 text-gray-800 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        {/* Manage groups modal for resources */}
        {manageResourceId && (
          <ManageGroupsModal
            open={showManageModal}
            userId={user.uid}
            resourceId={manageResourceId}
            onClose={() => {
              setShowManageModal(false);
              setManageResourceId(null);
            }}
            onSaved={() => {
              // Optionally refresh resources list after changing group membership
              axios
                .get(
                  `http://localhost:3001/api/resources?ownerId=${encodeURIComponent(
                    user.uid
                  )}`
                )
                .then((res) => setResources(res.data))
                .catch((_err) => {
                  console.debug("[Profile] refresh resources failed", _err);
                });
            }}
          />
        )}
        {/* Posted Resources Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 px-2 sm:px-4 md:px-6">
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
                image={res.image ?? undefined}
                onDelete={handleDelete}
                onEdit={handleEdit}
                showActions={true}
                onManageGroups={() => {
                  setManageResourceId(res.id);
                  setShowManageModal(true);
                }}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
