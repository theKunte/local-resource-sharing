import { useEffect, useState } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import apiClient from "../utils/apiClient";
import { useNavigate, Link } from "react-router-dom";
import { logError } from "../utils/errorHandler";

export default function Profile() {
  const { user, loading, signOutUser } = useFirebaseAuth();
  const [resourceCount, setResourceCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const [sharedCount, setSharedCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // Fetch counts for stats
  useEffect(() => {
    if (!user) return;
    apiClient
      .get(`/api/resources?ownerId=${encodeURIComponent(user.uid)}`)
      .then((res) => {
        setResourceCount(res.data.length);
        setSharedCount(
          res.data.filter(
            (r: { sharedWith?: unknown[] }) =>
              r.sharedWith && r.sharedWith.length > 0,
          ).length,
        );
      })
      .catch((err) => logError("Profile - loadResources", err));

    apiClient
      .get(`/api/groups?userId=${encodeURIComponent(user.uid)}`)
      .then((res) => setGroupCount(res.data.length))
      .catch((err) => logError("Profile - loadGroups", err));
  }, [user]);

  const handleSignOut = async () => {
    await signOutUser();
    navigate("/");
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return null;

  const memberSince = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex">
      <main className="flex-1 px-4 py-6 md:p-10 max-w-2xl mx-auto">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="w-24 h-24 rounded-full border-4 border-gray-100 object-cover mb-4"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary-600 flex items-center justify-center text-white text-3xl font-bold mb-4">
                {(user.displayName || user.email || "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-900">
              {user.displayName || "User"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{user.email}</p>
            {memberSince && (
              <p className="text-xs text-gray-400 mt-1">
                Member since {memberSince}
              </p>
            )}
          </div>

          {/* Stats Row */}
          <div className="flex justify-around mt-6 pt-5 border-t border-gray-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {resourceCount}
              </p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Gear
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{groupCount}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Groups
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{sharedCount}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Shared
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <Link
            to="/my-gear"
            className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🎒</span>
              <span className="font-medium text-gray-800">My Gear</span>
            </div>
            <span className="text-gray-400">›</span>
          </Link>
          <Link
            to="/groups"
            className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">👥</span>
              <span className="font-medium text-gray-800">My Groups</span>
            </div>
            <span className="text-gray-400">›</span>
          </Link>
          <Link
            to="/requests"
            className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📋</span>
              <span className="font-medium text-gray-800">Requests</span>
            </div>
            <span className="text-gray-400">›</span>
          </Link>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <h2 className="px-5 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Account
          </h2>
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <span className="text-sm text-gray-600">Sign-in provider</span>
            <span className="text-sm font-medium text-gray-800">
              {user.providerData[0]?.providerId === "google.com"
                ? "Google"
                : user.providerData[0]?.providerId || "Email"}
            </span>
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-gray-600">User ID</span>
            <span className="text-sm font-mono text-gray-400 truncate max-w-[180px]">
              {user.uid.slice(0, 12)}…
            </span>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full py-3 rounded-xl border-2 border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-colors"
        >
          Sign Out
        </button>
      </main>
    </div>
  );
}
