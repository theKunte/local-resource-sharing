import { useEffect, useState } from "react";
import apiClient from "../utils/apiClient";
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
      apiClient
        .get(`/api/resources?ownerId=${encodeURIComponent(user.uid)}`)
        .then((res) => setMyGear(res.data))
        .finally(() => setLoadingMyGear(false));

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
      const resp = await apiClient.put(`/api/resources/${resource.id}`, {
        title: newTitle,
        description: newDescription,
      });
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 mb-4"></div>
        <p className="text-gray-600 font-medium">Loading your dashboard...</p>
      </div>
    </div>
  );

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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in to view your gear</h2>
          <p className="text-gray-600">Sign in to access your dashboard and community gear</p>
        </div>
      </div>
    );
  }

  // Authenticated user dashboard
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Inline status/toast banner */}
      {statusMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
          <div className="flex items-center gap-3 bg-success-600 text-white px-6 py-3 rounded-lg shadow-2xl">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-semibold">{statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="ml-2 text-white/80 hover:text-white transition-colors"
              aria-label="Dismiss status"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {/* Welcome Section */}
      <section className="mb-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent mb-3">
              Welcome back, {user.displayName || user.email}!
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Manage your gear and connect with your adventure community
            </p>
          </div>
        </div>
      </section>{" "}
      {/* Community Gear Section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 flex items-center">
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
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600 mb-4"></div>
            <p className="text-gray-600 font-medium">Loading community gear...</p>
          </div>
        ) : communityGear.length === 0 ? (
          <div className="text-center py-16 px-6 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl border border-primary-200 animate-fade-in">
            <svg className="mx-auto h-20 w-20 text-primary-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No community gear available
            </h3>
            <p className="text-gray-600 mb-1">
              Join groups or invite friends to start discovering gear from your trusted network!
            </p>
            <p className="text-sm text-gray-500">
              Gear is only visible to people within your trusted groups for safety and privacy.
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
      {/* Your Gear Section */}
      <section className="mb-8">
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
            <button className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:shadow-lg active:scale-95 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Share Gear
            </button>
          </Link>
        </div>

        {loadingMyGear ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600 mb-4"></div>
            <p className="text-gray-600 font-medium">Loading your gear...</p>
          </div>
        ) : myGear.length === 0 ? (
          <div className="text-center py-16 px-6 bg-gradient-to-br from-success-50 to-success-100 rounded-2xl border border-success-200 animate-fade-in">
            <svg className="mx-auto h-20 w-20 text-success-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No gear shared yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start building trust in your community by sharing items you're not using.
            </p>
            <Link to="/post">
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-success-600 text-white rounded-lg hover:bg-success-700 transition-all shadow-md hover:shadow-lg active:scale-95 font-semibold">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Share Your First Item
              </button>
            </Link>
          </div>
        ) : (
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
