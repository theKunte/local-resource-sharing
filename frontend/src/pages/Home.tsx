import { useEffect, useState } from "react";
import axios from "axios";
import GearCard, { Gear } from "../components/GearCard";
import ManageGroupsModal from "../components/ManageGroupsModal";
import { Link } from "react-router-dom";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";

export default function Home() {
  const { user, loading, signInWithGoogle } = useFirebaseAuth();
  const [myGear, setMyGear] = useState<Gear[]>([]);
  const [communityGear, setCommunityGear] = useState<Gear[]>([]);
  const [loadingMyGear, setLoadingMyGear] = useState(false);
  const [loadingCommunityGear, setLoadingCommunityGear] = useState(false);
  const [manageResourceId, setManageResourceId] = useState<string | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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
  // Landing page for non-authenticated users
  const handleRequestBorrow = (gearId: string) => {
    // TODO: Implement borrow request functionality
    alert(`Request to borrow gear ${gearId} sent! (Feature coming soon)`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
          {" "}
          {/* Hero Section */}
          <div className="text-center mb-12 lg:mb-16">
            <div className="mb-6 lg:mb-8">
              <span
                role="img"
                aria-label="hiking backpack"
                className="text-5xl sm:text-6xl"
              >
                �️
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 lg:mb-6 leading-tight">
              GearShare
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-6 lg:mb-8 leading-relaxed px-4">
              Share outdoor gear with trusted friends and discover amazing
              equipment for your next adventure. From camping and hiking to
              climbing and water sports — get access to the gear you need.
            </p>{" "}
            <button
              onClick={signInWithGoogle}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 transform hover:scale-105 shadow-lg mb-4"
            >
              🏔️ Start Sharing Gear - Sign in with Google
            </button>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              New to GearShare? Your account will be created automatically when
              you sign in with Google.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12 lg:mb-16">
            <div className="text-center p-6 bg-white rounded-xl shadow-md">
              <h3 className="text-lg sm:text-xl font-semibold mb-3 text-gray-800">
                Share Camping Gear
              </h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Lend your tents, sleeping bags, and camping equipment to trusted
                friends.
              </p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-md">
              <div className="text-3xl sm:text-4xl mb-4">�</div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3 text-gray-800">
                Hiking & Climbing
              </h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Access hiking boots, climbing gear, and outdoor equipment when
                you need it.
              </p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-md sm:col-span-2 lg:col-span-1">
              <div className="text-3xl sm:text-4xl mb-4">🏔️</div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3 text-gray-800">
                Adventure Ready
              </h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Build trust within your group and share gear for any outdoor
                adventure.
              </p>
            </div>
          </div>{" "}
          {/* How It Works Section */}
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 lg:mb-12">
              How It Works
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-xl sm:text-2xl font-bold text-blue-600">
                    1
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2">
                  Join & Connect
                </h3>
                <p className="text-gray-600 text-center text-sm sm:text-base px-4">
                  Sign up and create groups with friends you trust to share gear
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-xl sm:text-2xl font-bold text-green-600">
                    2
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2">
                  Share Your Gear
                </h3>
                <p className="text-gray-600 text-center text-sm sm:text-base px-4">
                  List your outdoor equipment and make it available to your
                  trusted group
                </p>
              </div>
              <div className="flex flex-col items-center sm:col-span-2 lg:col-span-1">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-xl sm:text-2xl font-bold text-purple-600">
                    3
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2">
                  Borrow & Adventure
                </h3>
                <p className="text-gray-600 text-center text-sm sm:text-base px-4">
                  Request gear from friends and embark on your next outdoor
                  adventure
                </p>
              </div>
            </div>
          </div>
          {/* Call to Action */}
          <div className="text-center bg-white rounded-xl p-6 sm:p-8 shadow-lg max-w-2xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              Ready to Share Your Gear?
            </h2>
            <p className="text-gray-600 mb-6 text-sm sm:text-base">
              Join adventurers who trust each other to share amazing outdoor
              equipment.
            </p>
            <button
              onClick={signInWithGoogle}
              className="bg-gradient-to-r from-blue-600 to-green-500 text-white px-6 sm:px-8 py-3 rounded-lg text-base sm:text-lg font-semibold hover:from-blue-700 hover:to-green-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              🏔️ Start Sharing Gear
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated user dashboard
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
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt="avatar"
              className="w-20 h-20 rounded-full border shadow mb-2"
            />
          )}{" "}
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
                isAvailable={true}
                showActions={false}
                onRequestBorrow={handleRequestBorrow}
              />
            ))}
          </div>
        )}
      </section>
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
