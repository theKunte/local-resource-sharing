import { useEffect, useState } from "react";
import apiClient from "../utils/apiClient";
import GearCard, { Gear } from "../components/GearCard";
import ManageGroupsModal from "../components/ManageGroupsModal";
import BorrowRequestModal from "../components/BorrowRequestModal";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";

export default function Home() {
  const { user, loading } = useFirebaseAuth();
  const [communityGear, setCommunityGear] = useState<Gear[]>([]);
  const [loadingCommunityGear, setLoadingCommunityGear] = useState(false);
  const [manageResourceId, setManageResourceId] = useState<string | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      // Load community gear (from groups)
      setLoadingCommunityGear(true);
      apiClient
        .get(`/api/resources?user=${encodeURIComponent(user.uid)}`)
        .then((res) => setCommunityGear(res.data))
        .finally(() => setLoadingCommunityGear(false));
    }
  }, [user]);

  // Delete a resource (only owner can)
  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await apiClient.delete(`/api/resources/${resourceId}`, {
        data: { userId: user?.uid },
      });
      // remove from list
      setCommunityGear((prev) => prev.filter((g) => g.id !== resourceId));
      try {
        window.dispatchEvent(
          new CustomEvent("resource:deleted", { detail: { id: resourceId } })
        );
      } catch (_err) {
        console.debug("[Home] dispatch resource:deleted failed", _err);
      }
      setStatusMessage("Resource deleted");
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (error) {
      console.error("Error deleting resource:", error);
      setStatusMessage("Failed to delete resource");
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  // Edit a resource (simple prompt-based flow)
  const handleEditResource = async (resource: Gear) => {
    const newTitle = prompt("Edit title:", resource.title);
    if (!newTitle) return;
    const newDescription = prompt("Edit description:", resource.description);
    if (!newDescription) return;
    try {
      const resp = await apiClient.put(`/api/resources/${resource.id}`, {
        title: newTitle,
        description: newDescription,
      });
      // update local list
      setCommunityGear((prev) =>
        prev.map((g) => (g.id === resp.data.id ? resp.data : g))
      );
      try {
        window.dispatchEvent(
          new CustomEvent("resource:updated", {
            detail: { resource: resp.data },
          })
        );
      } catch (_err) {
        console.debug("[Home] dispatch resource:updated failed", _err);
      }
      setStatusMessage("Resource updated");
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (error) {
      console.error("Error updating resource:", error);
      setStatusMessage("Failed to update resource");
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  // Listen for resource change events (delete/update) coming from other pages
  useEffect(() => {
    const onDeleted = (e: Event) => {
      const ce = e as CustomEvent<{ id: string }>;
      const id = ce?.detail?.id;
      if (!id) return;
      setMyGear((prev) => prev.filter((g) => g.id !== id));
      setCommunityGear((prev) => prev.filter((g) => g.id !== id));
    };

    const onUpdated = (e: Event) => {
      const ce = e as CustomEvent<{ resource: Gear }>;
      const r = ce?.detail?.resource;
      if (!r) return;
      setMyGear((prev) => prev.map((g) => (g.id === r.id ? r : g)));
      setCommunityGear((prev) => prev.map((g) => (g.id === r.id ? r : g)));
    };

    window.addEventListener("resource:deleted", onDeleted);
    window.addEventListener("resource:updated", onUpdated);

    return () => {
      window.removeEventListener("resource:deleted", onDeleted);
      window.removeEventListener("resource:updated", onUpdated);
    };
  }, []);

  const handleRequestBorrow = (gearId: string) => {
    const resource = communityGear.find((g) => g.id === gearId);

    if (resource) {
      const newSelection = { id: resource.id, title: resource.title };
      setSelectedResource(newSelection);
      setBorrowModalOpen(true);
    } else {
      console.error(
        "[Home] !!!!! ERROR: Resource not found in communityGear !!!!!"
      );
      console.error("[Home] Looking for ID:", gearId);
      console.error(
        "[Home] Available IDs:",
        communityGear.map((g) => g.id)
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Please log in to view your gear
          </h2>
          <p className="text-gray-600">
            Sign in to access your dashboard and community gear
          </p>
        </div>
      </div>
    );
  }

  // Authenticated user dashboard
  return (
    <div className="h-full flex flex-col">
      {/* Inline status/toast banner */}
      {statusMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg">
            <span className="text-sm font-medium">{statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="ml-3 text-white/80 hover:text-white text-sm"
              aria-label="Dismiss status"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Fixed Header Section */}
      <section className="px-4 pt-6 pb-4 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Explore Community Gear
          </h1>
          <p className="text-sm text-gray-600">
            Discover and borrow gear from your trusted network
          </p>
        </div>
      </section>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Community Gear Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="mr-2">🌐</span>
                Available Gear
                {communityGear.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({communityGear.length} item
                    {communityGear.length !== 1 ? "s" : ""})
                  </span>
                )}
              </h2>
            </div>

            {loadingCommunityGear ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                <p className="text-gray-500 mt-2">Loading community gear...</p>
              </div>
            ) : communityGear.length === 0 ? (
              <div className="text-center py-12 px-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-200">
                <span className="text-5xl mb-4 block">👥</span>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No community gear available
                </h3>
                <p className="text-gray-500 mb-4">
                  Join groups or invite friends to start discovering gear from
                  your trusted network!
                </p>
                <p className="text-sm text-gray-400">
                  Gear is only visible to people within your trusted groups for
                  safety and privacy.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {communityGear.map((item) => (
                  <GearCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    description={item.description}
                    image={item.image}
                    status={item.status}
                    currentLoan={item.currentLoan}
                    isAvailable={true}
                    showActions={false}
                    onRequestBorrow={handleRequestBorrow}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Borrow request modal */}
      {selectedResource && user && (
        <BorrowRequestModal
          isOpen={borrowModalOpen}
          onClose={() => {
            setBorrowModalOpen(false);
            setSelectedResource(null);
          }}
          resourceId={selectedResource.id}
          resourceTitle={selectedResource.title}
          userId={user.uid}
        />
      )}
      {/* Manage groups modal for items */}
      {manageResourceId && user && (
        <ManageGroupsModal
          open={showManageModal}
          userId={user.uid}
          resourceId={manageResourceId}
          onClose={() => {
            setShowManageModal(false);
            setManageResourceId(null);
          }}
          onSaved={async () => {
            // reload lists
            if (!user) return;
            setLoadingMyGear(true);
            setLoadingCommunityGear(true);
            try {
              const [myRes, communityRes] = await Promise.all([
                apiClient.get(
                  `/api/resources?ownerId=${encodeURIComponent(user.uid)}`
                ),
                apiClient.get(
                  `/api/resources?user=${encodeURIComponent(user.uid)}`
                ),
              ]);
              setMyGear(myRes.data);
              setCommunityGear(communityRes.data);
            } catch (_err) {
              console.error(_err);
            } finally {
              setLoadingMyGear(false);
              setLoadingCommunityGear(false);
            }
          }}
        />
      )}
    </div>
  );
}
