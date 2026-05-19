import { useEffect, useState } from "react";
import apiClient from "../utils/apiClient";
import GearCard, { Gear } from "../components/GearCard";
import ManageGroupsModal from "../components/ManageGroupsModal";
import BorrowRequestModal from "../components/BorrowRequestModal";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { logError } from "../utils/errorHandler";
import { CATEGORIES } from "../constants/categories";
import { useDebounce } from "../hooks/useDebounce";

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

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // Debounce search by 300ms
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]); // Changed to array for multi-select
  const [statusFilter, setStatusFilter] = useState("");
  const [recommendations, setRecommendations] = useState<Gear[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [activeFilters, setActiveFilters] = useState(false);

  const toggleCategory = (category: string) => {
    setCategoryFilters((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  // Load recommendations on mount
  useEffect(() => {
    if (user) {
      setLoadingRecommendations(true);
      apiClient
        .get("/api/resources/recommendations?limit=6")
        .then((res) => setRecommendations(res.data.data || []))
        .catch((err) => {
          logError("Home - load recommendations", err);
          setRecommendations([]);
        })
        .finally(() => setLoadingRecommendations(false));
    }
  }, [user]);

  // Load community gear or search results
  useEffect(() => {
    if (user) {
      setLoadingCommunityGear(true);

      // Check if any filters are active (use debounced query for filter check)
      const hasFilters = !!(
        debouncedSearchQuery.trim() ||
        categoryFilters.length > 0 ||
        statusFilter
      );
      setActiveFilters(hasFilters);

      if (hasFilters) {
        // Use search endpoint with filters
        const params = new URLSearchParams();
        if (debouncedSearchQuery.trim())
          params.append("q", debouncedSearchQuery.trim());
        // Add each category as a separate parameter
        categoryFilters.forEach((cat) => {
          params.append("category", cat);
        });
        if (statusFilter) params.append("status", statusFilter);
        params.append("limit", "50");

        apiClient
          .get(`/api/resources/search?${params.toString()}`)
          .then((res) => setCommunityGear(res.data.data ?? []))
          .catch((err) => {
            logError("Home - search resources", err);
            setCommunityGear([]);
          })
          .finally(() => setLoadingCommunityGear(false));
      } else {
        // Load all community gear
        apiClient
          .get(`/api/resources?user=${encodeURIComponent(user.uid)}`)
          .then((res) => setCommunityGear(res.data.data ?? res.data))
          .catch((err) => {
            logError("Home - load community gear", err);
            setCommunityGear([]);
          })
          .finally(() => setLoadingCommunityGear(false));
      }
    }
  }, [user, debouncedSearchQuery, categoryFilters, statusFilter]);

  // Listen for resource change events (delete/update) coming from other pages
  useEffect(() => {
    const onDeleted = (e: Event) => {
      const ce = e as CustomEvent<{ id: string }>;
      const id = ce?.detail?.id;
      if (!id) return;
      setCommunityGear((prev) => prev.filter((g) => g.id !== id));
    };

    const onUpdated = (e: Event) => {
      const ce = e as CustomEvent<{ resource: Gear }>;
      const r = ce?.detail?.resource;
      if (!r) return;
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
      logError("Home - handleRequestBorrow", `Resource not found: ${gearId}`);
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
          <div className="flex items-center gap-3 bg-cyan-400 text-white px-4 py-2 rounded-lg shadow-lg">
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
          <p className="text-sm text-gray-600 mb-4">
            Discover and borrow gear from your trusted network
          </p>

          {/* Search and Filter Controls */}
          <div className="space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
              <svg
                className="absolute left-3 top-3 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Filter Controls */}
            <div className="flex gap-2">
              {/* Category Multi-Select Dropdown */}
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.nextElementSibling?.classList.toggle(
                      "hidden",
                    );
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm bg-white text-left flex justify-between items-center"
                >
                  <span
                    className={
                      categoryFilters.length === 0
                        ? "text-gray-500"
                        : "text-gray-900"
                    }
                  >
                    {categoryFilters.length === 0
                      ? "All Categories"
                      : `${categoryFilters.length} selected`}
                  </span>
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg hidden max-h-60 overflow-y-auto">
                  <div className="p-2 space-y-1">
                    {CATEGORIES.map((cat) => (
                      <label
                        key={cat}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={categoryFilters.includes(cat)}
                          onChange={() => toggleCategory(cat)}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{cat}</span>
                      </label>
                    ))}
                  </div>
                  {categoryFilters.length > 0 && (
                    <div className="border-t border-gray-200 p-2">
                      <button
                        type="button"
                        onClick={() => setCategoryFilters([])}
                        className="w-full text-xs text-primary-600 hover:text-primary-700 font-medium py-1"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">All Status</option>
                <option value="AVAILABLE">Available</option>
                <option value="BORROWED">Borrowed</option>
                <option value="UNAVAILABLE">Unavailable</option>
              </select>
            </div>

            {/* Active Filters Indicator */}
            {activeFilters && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-600">Filters active:</span>
                {searchQuery && (
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full">
                    "{searchQuery}"
                  </span>
                )}
                {categoryFilters.length > 0 && (
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full">
                    {categoryFilters.join(", ")}
                  </span>
                )}
                {statusFilter && (
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full">
                    {statusFilter}
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilters([]);
                    setStatusFilter("");
                  }}
                  className="ml-auto text-primary-600 hover:text-primary-700 font-medium"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 pb-28">
          {/* Recommendations Section - Only show when no filters are active */}
          {!activeFilters && recommendations.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <span className="mr-2">✨</span>
                  For You
                  <span className="ml-2 text-xs font-normal text-gray-500 bg-primary-50 px-2 py-1 rounded-full">
                    Based on your activity
                  </span>
                </h2>
              </div>

              {loadingRecommendations ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recommendations.slice(0, 4).map((item) => (
                    <GearCard
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      description={item.description}
                      image={item.image}
                      category={item.category}
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
          )}

          {/* Community Gear Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="mr-2">{activeFilters ? "🔍" : "🌐"}</span>
                {activeFilters ? "Search Results" : "Available Gear"}
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
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                <p className="text-gray-500 mt-2">
                  {activeFilters ? "Searching..." : "Loading community gear..."}
                </p>
              </div>
            ) : communityGear.length === 0 ? (
              <div className="text-center py-12 px-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-200">
                <span className="text-5xl mb-4 block">
                  {activeFilters ? "🔍" : "👥"}
                </span>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {activeFilters
                    ? "No results found"
                    : "No community gear available"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {activeFilters
                    ? "Try adjusting your search filters or keywords to find what you're looking for."
                    : "Join groups or invite friends to start discovering gear from your trusted network!"}
                </p>
                {!activeFilters && (
                  <p className="text-sm text-gray-400">
                    Gear is only visible to people within your trusted groups
                    for safety and privacy.
                  </p>
                )}
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
                    category={item.category}
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
            // reload community gear
            if (!user) return;
            setLoadingCommunityGear(true);
            try {
              const res = await apiClient.get(
                `/api/resources?user=${encodeURIComponent(user.uid)}`,
              );
              setCommunityGear(res.data.data ?? res.data);
            } catch (err) {
              logError("Home - reload community gear", err);
            } finally {
              setLoadingCommunityGear(false);
            }
          }}
        />
      )}
    </div>
  );
}
