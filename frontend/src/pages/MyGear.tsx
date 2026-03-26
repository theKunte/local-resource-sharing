import { useEffect, useState } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import apiClient from "../utils/apiClient";
import { useNavigate } from "react-router-dom";
import GearCard, { Gear } from "../components/GearCard";
import ManageGroupsModal from "../components/ManageGroupsModal";
import { logError } from "../utils/errorHandler";

export default function MyGear() {
  const { user, loading } = useFirebaseAuth();
  const [myGear, setMyGear] = useState<Gear[]>([]);
  const [loadingGear, setLoadingGear] = useState(false);
  const [manageResourceId, setManageResourceId] = useState<string | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  // Load user's own gear
  useEffect(() => {
    if (user) {
      setLoadingGear(true);
      apiClient
        .get(`/api/resources?ownerId=${encodeURIComponent(user.uid)}`)
        .then((res) => setMyGear(res.data.data ?? res.data))
        .finally(() => setLoadingGear(false));
    }
  }, [user]);

  // Listen for resource updates from other pages
  useEffect(() => {
    const handleUpdate = ((e: CustomEvent) => {
      const { resource } = e.detail;
      setMyGear((prev) =>
        prev.map((g) => (g.id === resource.id ? resource : g)),
      );
    }) as EventListener;

    const handleDelete = ((e: CustomEvent) => {
      const { id } = e.detail;
      setMyGear((prev) => prev.filter((g) => g.id !== id));
    }) as EventListener;

    window.addEventListener("resource:updated", handleUpdate);
    window.addEventListener("resource:deleted", handleDelete);

    return () => {
      window.removeEventListener("resource:updated", handleUpdate);
      window.removeEventListener("resource:deleted", handleDelete);
    };
  }, []);

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await apiClient.delete(`/api/resources/${resourceId}`, {
        data: { userId: user?.uid },
      });
      setMyGear((prev) => prev.filter((g) => g.id !== resourceId));
      window.dispatchEvent(
        new CustomEvent("resource:deleted", { detail: { id: resourceId } }),
      );
      setStatusMessage("Resource deleted successfully");
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (error: any) {
      console.error("Error deleting resource:", error);
      logError("MyGear - handleDeleteResource", error);

      // Show specific error message from backend
      const errorMessage =
        error.response?.data?.error || "Failed to delete resource";
      setStatusMessage(errorMessage);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleEditResource = async (resource: Gear) => {
    const newTitle = prompt("Edit title:", resource.title);
    if (!newTitle || newTitle.trim() === "") return;
    const newDescription = prompt("Edit description:", resource.description);
    if (!newDescription || newDescription.trim() === "") return;

    try {
      const resp = await apiClient.put(`/api/resources/${resource.id}`, {
        title: newTitle.trim(),
        description: newDescription.trim(),
      });

      setMyGear((prev) =>
        prev.map((g) => (g.id === resp.data.id ? { ...g, ...resp.data } : g)),
      );
      window.dispatchEvent(
        new CustomEvent("resource:updated", {
          detail: { resource: resp.data },
        }),
      );
      setStatusMessage("Resource updated successfully");
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (error) {
      logError("MyGear - handleEditResource", error);
      setStatusMessage("Failed to update resource");
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const handleManageGroups = (gear: {
    id: string;
    title: string;
    description: string;
    image?: string;
  }) => {
    setManageResourceId(gear.id);
    setShowManageModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">My Gear</h1>
          <p className="text-slate-600">
            Manage your personal collection and sharing settings.
          </p>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg text-primary-800">
            {statusMessage}
          </div>
        )}

        {/* Stats Card */}
        <div className="mb-6 bg-white/80 backdrop-blur-sm p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Total Collection
              </div>
              <div className="text-4xl font-bold text-slate-900">
                {myGear.length}
              </div>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">
                  Available
                </div>
                <div className="text-3xl font-bold text-emerald-600">
                  {myGear.filter((g) => g.status !== "BORROWED").length}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">
                  Borrowed
                </div>
                <div className="text-3xl font-bold text-amber-600">
                  {myGear.filter((g) => g.status === "BORROWED").length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gear Grid */}
        {loadingGear ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
          </div>
        ) : myGear.length === 0 ? (
          <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-[2rem] border border-slate-100 shadow-sm">
            <svg
              className="mx-auto h-12 w-12 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-slate-900">
              No gear yet
            </h3>
            <p className="mt-1 text-slate-500">
              Get started by sharing your first item
            </p>
          </div>
        ) : (
          <div className="space-y-6 pb-20">
            {myGear.map((gear) => (
              <GearCard
                key={gear.id}
                {...gear}
                onDelete={handleDeleteResource}
                onEdit={handleEditResource}
                onManageGroups={handleManageGroups}
                showActions={true}
              />
            ))}
          </div>
        )}

        {/* Manage Groups Modal */}
        {showManageModal && manageResourceId && user && (
          <ManageGroupsModal
            open={showManageModal}
            userId={user.uid}
            resourceId={manageResourceId}
            onClose={() => {
              setShowManageModal(false);
              setManageResourceId(null);
            }}
            onSaved={async () => {
              // Reload gear after group changes
              if (!user) return;
              setLoadingGear(true);
              try {
                const res = await apiClient.get(
                  `/api/resources?ownerId=${encodeURIComponent(user.uid)}`,
                );
                setMyGear(res.data.data ?? res.data);
              } catch (error) {
                logError("MyGear - reload gear after group changes", error);
              } finally {
                setLoadingGear(false);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
