import { useEffect, useState } from "react";
import axios from "axios";
import GearCard, { Gear } from "../components/GearCard";
import ManageGroupsModal from "../components/ManageGroupsModal";
import BorrowRequestModal from "../components/BorrowRequestModal";
import RequestDashboard from "../components/RequestDashboard";
import { Link } from "react-router-dom";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";

export default function Home() {
  const { user, loading } = useFirebaseAuth();
  const [myGear, setMyGear] = useState<Gear[]>([]);
  const [communityGear, setCommunityGear] = useState<Gear[]>([]);
  const [loadingMyGear, setLoadingMyGear] = useState(false);
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
      // Load user's own gear
      setLoadingMyGear(true);
      axios
        .get(
          `http://localhost:3001/api/resources?ownerId=${encodeURIComponent(
            user.uid
          )}`
        )
        .then((res) => setMyGear(res.data))
        .finally(() => setLoadingMyGear(false));

      // Load community gear (from groups)
      setLoadingCommunityGear(true);
      axios
        .get(
          `http://localhost:3001/api/resources?user=${encodeURIComponent(
            user.uid
          )}`
        )
        .then((res) => setCommunityGear(res.data))
        .finally(() => setLoadingCommunityGear(false));
    }
  }, [user]);

  // Delete a resource (only owner can)
  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await axios.delete(`http://localhost:3001/api/resources/${resourceId}`, {
        data: { userId: user?.uid },
      });
      // remove from lists
      setMyGear((prev) => prev.filter((g) => g.id !== resourceId));
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
      const resp = await axios.put(
        `http://localhost:3001/api/resources/${resource.id}`,
        {
          title: newTitle,
          description: newDescription,
        }
      );
      // update local lists
      setMyGear((prev) =>
        prev.map((g) => (g.id === resp.data.id ? resp.data : g))
      );
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

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  const handleRequestBorrow = (gearId: string) => {
    console.log("[Home] ===== BORROW REQUEST INITIATED =====");
    console.log("[Home] gearId:", gearId);
    console.log("[Home] communityGear array:", communityGear);
    console.log("[Home] Current borrowModalOpen state:", borrowModalOpen);
    console.log("[Home] Current selectedResource state:", selectedResource);

    const resource = communityGear.find((g) => g.id === gearId);
    console.log("[Home] Found resource:", resource);

    if (resource) {
      const newSelection = { id: resource.id, title: resource.title };
      console.log("[Home] Setting selectedResource to:", newSelection);
      setSelectedResource(newSelection);

      console.log("[Home] Setting borrowModalOpen to true");
      setBorrowModalOpen(true);

      console.log("[Home] ===== STATE UPDATES TRIGGERED =====");
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

  if (!user) {
    return (
      <div className="p-8 text-center">Please log in to view your gear.</div>
    );
  }

  // Authenticated user dashboard
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Inline status/toast banner */}
      {statusMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
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
      {/* Welcome Section */}
      <section className="mb-10 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              Welcome back, {user.displayName || user.email}!
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Manage your gear and connect with your adventure community
            </p>
          </div>
        </div>
      </section>{" "}
      {/* Your Gear Section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
            <span className="mr-3">🎒</span>
            Your Shared Gear
            {myGear.length > 0 && (
              <span className="ml-3 text-lg font-normal text-gray-500">
                ({myGear.length} item{myGear.length !== 1 ? "s" : ""})
              </span>
            )}
          </h2>
          <Link to="/post">
            <button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 text-sm sm:text-base">
              <span className="mr-1 sm:mr-2">🏔️</span>
              Share Gear
            </button>
          </Link>
        </div>

        {loadingMyGear ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <p className="text-gray-500 mt-2">Loading your gear...</p>
          </div>
        ) : myGear.length === 0 ? (
          <div className="text-center py-12 px-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-dashed border-emerald-200">
            <span className="text-5xl mb-4 block">📦</span>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No gear shared yet
            </h3>
            <p className="text-gray-500 mb-4">
              Start building your gear sharing community!
            </p>
            <Link to="/post">
              <button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105">
                <span className="mr-2">🏔️</span>
                Share Your First Gear
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 px-2 sm:px-4 md:px-6">
            {myGear.map((item) => (
              <GearCard
                key={item.id}
                id={item.id}
                title={item.title}
                description={item.description}
                image={item.image}
                status={item.status}
                currentLoan={item.currentLoan}
                isAvailable={true}
                showActions={true}
                onDelete={handleDeleteResource}
                onEdit={handleEditResource}
                onManageGroups={() => {
                  setManageResourceId(item.id);
                  setShowManageModal(true);
                }}
              />
            ))}
          </div>
        )}
      </section>
      {/* Community Gear Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
            <span className="mr-3">🤝</span>
            <span className="mr-3">🤝</span>
            <span className="mr-3">🤝</span>
            Community Gear
            {communityGear.length > 0 && (
              <span className="ml-3 text-lg font-normal text-gray-500">
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
              Join groups or invite friends to start discovering gear from your
              trusted network!
            </p>
            <p className="text-sm text-gray-400">
              Gear is only visible to people within your trusted groups for
              safety and privacy.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 px-2 sm:px-4 md:px-6">
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
      {/* Borrow Requests Section */}
      <section className="-mt-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
          <span className="mr-3">📋</span>
          Borrow Requests
        </h2>
        <p className="text-gray-600 mt-2">
          Manage incoming requests and track your pending requests
        </p>
        {user?.uid && <RequestDashboard userId={user.uid} />}
      </section>
      {/* Borrow request modal */}
      {(() => {
        console.log("[Home] ===== MODAL RENDER CHECK =====");
        console.log("[Home] selectedResource:", selectedResource);
        console.log("[Home] user:", user?.email || "null");
        console.log("[Home] borrowModalOpen:", borrowModalOpen);
        console.log("[Home] Will render modal:", !!(selectedResource && user));
        return null;
      })()}
      {selectedResource && user && (
        <BorrowRequestModal
          isOpen={borrowModalOpen}
          onClose={() => {
            console.log("[Home] Closing modal");
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
                axios.get(
                  `http://localhost:3001/api/resources?ownerId=${encodeURIComponent(
                    user.uid
                  )}`
                ),
                axios.get(
                  `http://localhost:3001/api/resources?user=${encodeURIComponent(
                    user.uid
                  )}`
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
