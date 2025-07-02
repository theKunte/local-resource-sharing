import { useEffect, useState } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import GearCard, { Gear } from "../components/GearCard";

interface Group {
  id: string;
  name: string;
  createdById: string;
  avatar?: string;
  memberCount?: number;
  members?: Array<{
    id: string;
    user: {
      id: string;
      email: string;
      name?: string;
    };
  }>;
}

export default function Profile() {
  const { user, loading } = useFirebaseAuth();
  const [gear, setGear] = useState<Gear[]>([]);
  const [sharedGear, setSharedGear] = useState<Gear[]>([]);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [activeTab, setActiveTab] = useState<"gear" | "groups" | "borrowed">(
    "gear"
  );
  const [activeGearTab, setActiveGearTab] = useState<
    "your" | "shared" | "borrowed"
  >("your");
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      // Load user's gear
      axios
        .get(
          `http://localhost:3001/api/resources?ownerId=${encodeURIComponent(
            user.uid
          )}`
        )
        .then((res) => {
          const actualGear = res.data;

          // Add some sample gear for demonstration if the user has less than 8 items
          const sampleGear: Gear[] = [
            {
              id: "sample-1",
              title: "North Face Backpack 65L",
              description:
                "Large capacity hiking backpack perfect for multi-day adventures. Features multiple compartments and rain cover.",
              image:
                "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop",
            },
            {
              id: "sample-2",
              title: "Coleman 4-Person Tent",
              description:
                "Spacious family camping tent with easy setup. Waterproof and includes vestibule for gear storage.",
              image:
                "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=300&fit=crop",
            },
            {
              id: "sample-3",
              title: "Patagonia Down Jacket",
              description:
                "Lightweight insulated jacket perfect for cold weather hiking and camping. Compressible and warm.",
              image:
                "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=300&fit=crop",
            },
            {
              id: "sample-4",
              title: "MSR Camping Stove",
              description:
                "Reliable single-burner camping stove with fuel efficiency. Great for backpacking trips.",
              image:
                "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
            },
            {
              id: "sample-5",
              title: "Black Diamond Headlamp",
              description:
                "Bright LED headlamp with multiple lighting modes. Perfect for night hiking and camping.",
              image:
                "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=400&h=300&fit=crop",
            },
            {
              id: "sample-6",
              title: "Sleeping Bag -10°C",
              description:
                "Winter-rated sleeping bag suitable for cold weather camping. Mummy style with compression sack.",
              image:
                "https://images.unsplash.com/photo-1520637836862-4d197d17c87a?w=400&h=300&fit=crop",
            },
            {
              id: "sample-7",
              title: "Climbing Harness & Gear",
              description:
                "Complete climbing set including harness, carabiners, and belay device. Perfect for rock climbing.",
              image:
                "https://images.unsplash.com/photo-1522163723043-478d6d804525?w=400&h=300&fit=crop",
            },
            {
              id: "sample-8",
              title: "Portable Water Filter",
              description:
                "Lightweight water purification system for backcountry adventures. Filters up to 1000 liters.",
              image:
                "https://images.unsplash.com/photo-1548036952-6479d7bd6b36?w=400&h=300&fit=crop",
            },
          ];

          // Combine actual gear with sample gear (remove duplicates if needed)
          const combinedGear = [...actualGear];
          const remainingSlots = Math.max(0, 8 - actualGear.length);
          if (remainingSlots > 0) {
            combinedGear.push(...sampleGear.slice(0, remainingSlots));
          }

          setGear(combinedGear);
        });

      // Load user's groups with member details
      setLoadingGroups(true);
      axios
        .get(`http://localhost:3001/api/groups?userId=${user.uid}`)
        .then(async (res) => {
          // Get detailed info for each group including members
          const groupsWithDetails = await Promise.all(
            res.data.map(async (group: Group) => {
              try {
                const membersResponse = await axios.get(
                  `http://localhost:3001/api/groups/${group.id}/members`
                );
                return {
                  ...group,
                  memberCount: membersResponse.data.length,
                  members: membersResponse.data,
                };
              } catch (error) {
                console.error(
                  `Error loading members for group ${group.id}:`,
                  error
                );
                return { ...group, memberCount: 0, members: [] };
              }
            })
          );
          setUserGroups(groupsWithDetails);
        })
        .catch((err) => console.error("Error loading groups:", err))
        .finally(() => setLoadingGroups(false));

      // Load shared gear from user's groups
      const loadSharedGear = async () => {
        try {
          const groupsResponse = await axios.get(
            `http://localhost:3001/api/groups?userId=${user.uid}`
          );
          const allSharedGear: Gear[] = [];

          // For each group, fetch all gear shared by other members
          for (const group of groupsResponse.data) {
            try {
              const membersResponse = await axios.get(
                `http://localhost:3001/api/groups/${group.id}/members`
              );

              // Get gear from each member (excluding current user)
              for (const member of membersResponse.data) {
                if (member.user.id !== user.uid) {
                  try {
                    const gearResponse = await axios.get(
                      `http://localhost:3001/api/resources?ownerId=${encodeURIComponent(
                        member.user.id
                      )}`
                    );
                    allSharedGear.push(...gearResponse.data);
                  } catch (error) {
                    console.error(
                      `Error loading gear for member ${member.user.id}:`,
                      error
                    );
                  }
                }
              }
            } catch (error) {
              console.error(
                `Error loading members for group ${group.id}:`,
                error
              );
            }
          }

          // Add some sample shared gear for demonstration if no actual shared gear is found
          const sampleSharedGear: Gear[] = [
            {
              id: "shared-1",
              title: "REI Co-op Camping Chair",
              description:
                "Comfortable folding camping chair perfect for outdoor adventures. Lightweight and portable.",
              image:
                "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop",
            },
            {
              id: "shared-2",
              title: "Jetboil Flash Cooking System",
              description:
                "Fast and efficient camping stove system. Perfect for quick meals on the trail.",
              image:
                "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
            },
            {
              id: "shared-3",
              title: "Osprey Hiking Daypack",
              description:
                "Comfortable daypack for hiking with hydration system. Great for day trips.",
              image:
                "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop",
            },
            {
              id: "shared-4",
              title: "Patagonia Rain Jacket",
              description:
                "Waterproof and breathable rain jacket. Essential for unpredictable weather.",
              image:
                "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=300&fit=crop",
            },
            {
              id: "shared-5",
              title: "Goal Zero Solar Panel",
              description:
                "Portable solar charging panel for keeping devices powered in the wilderness.",
              image:
                "https://images.unsplash.com/photo-1548036952-6479d7bd6b36?w=400&h=300&fit=crop",
            },
            {
              id: "shared-6",
              title: "Therm-a-Rest Sleeping Pad",
              description:
                "Lightweight and comfortable sleeping pad for backpacking trips.",
              image:
                "https://images.unsplash.com/photo-1520637836862-4d197d17c87a?w=400&h=300&fit=crop",
            },
          ];

          // If no shared gear found, add sample gear for demonstration
          if (allSharedGear.length === 0) {
            allSharedGear.push(...sampleSharedGear);
          }

          setSharedGear(allSharedGear);
        } catch (error) {
          console.error("Error loading shared gear:", error);
        }
      };

      loadSharedGear();
    }
  }, [user]);

  // Delete resource handler
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this resource?"))
      return;
    await axios.delete(`http://localhost:3001/api/resources/${id}`);
    setGear((prev) => prev.filter((r) => r.id !== id));
  };

  // Edit gear handler
  const handleEdit = async (gearItem: Gear) => {
    const newTitle = prompt("Edit title:", gearItem.title);
    if (!newTitle) return;
    const newDescription = prompt("Edit description:", gearItem.description);
    if (!newDescription) return;
    const updated = await axios.put(
      `http://localhost:3001/api/resources/${gearItem.id}`,
      {
        title: newTitle,
        description: newDescription,
      }
    );
    setGear((prev) =>
      prev.map((r) => (r.id === gearItem.id ? { ...r, ...updated.data } : r))
    );
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between py-4">
            <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
            <div className="flex items-center gap-4">
              <button className="text-gray-500 hover:text-gray-700 text-sm">
                Edit
              </button>
              <button className="text-gray-500 hover:text-gray-700 text-sm">
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold border overflow-hidden">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="avatar"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-gray-500">Avatar</span>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {user.displayName || "Name"}
              </h2>
              <p className="text-gray-600 mb-4">{user.email}</p>

              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab("gear")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === "gear"
                        ? "border-emerald-500 text-emerald-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Gear
                  </button>
                  <button
                    onClick={() => setActiveTab("groups")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === "groups"
                        ? "border-emerald-500 text-emerald-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Groups
                  </button>
                  <button
                    onClick={() => setActiveTab("borrowed")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === "borrowed"
                        ? "border-emerald-500 text-emerald-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Borrowed
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Sub-tabs for Gear section */}
          {activeTab === "gear" && (
            <div className="border-b border-gray-200 px-6 pt-4">
              <div className="flex space-x-6">
                <button
                  onClick={() => setActiveGearTab("your")}
                  className={`pb-3 border-b-2 font-medium text-sm transition-colors ${
                    activeGearTab === "your"
                      ? "border-emerald-500 text-emerald-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Your Gear
                </button>
                <button
                  onClick={() => setActiveGearTab("shared")}
                  className={`pb-3 border-b-2 font-medium text-sm transition-colors ${
                    activeGearTab === "shared"
                      ? "border-emerald-500 text-emerald-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Shared Gear
                </button>
                <button
                  onClick={() => setActiveGearTab("borrowed")}
                  className={`pb-3 border-b-2 font-medium text-sm transition-colors ${
                    activeGearTab === "borrowed"
                      ? "border-emerald-500 text-emerald-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Borrowed Gear
                </button>
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="p-6">
            {/* Gear Tab Content */}
            {activeTab === "gear" && (
              <div>
                {/* Your Gear Tab */}
                {activeGearTab === "your" &&
                  (gear.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <span className="text-gray-400 text-2xl">🎒</span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No gear yet
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Start sharing your outdoor gear with trusted friends!
                      </p>
                      <button
                        onClick={() => (window.location.href = "/post")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium"
                      >
                        Share Your First Gear
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                      {gear.map((item) => (
                        <GearCard
                          key={item.id}
                          id={item.id}
                          title={item.title}
                          description={item.description}
                          image={item.image}
                          isAvailable={true}
                          showActions={true}
                          onDelete={handleDelete}
                          onEdit={handleEdit}
                        />
                      ))}
                    </div>
                  ))}

                {/* Shared Gear Tab */}
                {activeGearTab === "shared" &&
                  (sharedGear.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <span className="text-gray-400 text-2xl">🤝</span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No shared gear available
                      </h3>
                      <p className="text-gray-500">
                        Gear shared by your group members will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                      {sharedGear.map((item) => (
                        <GearCard
                          key={item.id}
                          id={item.id}
                          title={item.title}
                          description={item.description}
                          image={item.image}
                          isAvailable={true}
                          showActions={false}
                          onRequestBorrow={(gearId) => {
                            // TODO: Implement borrow request functionality
                            alert(
                              `Request to borrow ${item.title} (ID: ${gearId}) has been sent!`
                            );
                          }}
                        />
                      ))}
                    </div>
                  ))}

                {/* Borrowed Gear Tab */}
                {activeGearTab === "borrowed" && (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <span className="text-gray-400 text-2xl">📦</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No borrowed gear
                    </h3>
                    <p className="text-gray-500">
                      Gear you've borrowed from friends will appear here.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Groups Tab Content */}
            {activeTab === "groups" && (
              <div>
                {loadingGroups ? (
                  <div className="text-center py-12">
                    <div className="text-gray-500">Loading groups...</div>
                  </div>
                ) : userGroups.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <span className="text-gray-400 text-2xl">👥</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No groups yet
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Create your first group to start sharing gear with
                      friends!
                    </p>
                    <Link
                      to="/groups"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium inline-block"
                    >
                      Create Group
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-6">
                    {userGroups.map((group) => (
                      <div key={group.id} className="text-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 mx-auto mb-2 flex items-center justify-center font-bold text-white overflow-hidden border-2 border-emerald-300 shadow-lg">
                          {group.avatar ? (
                            <img
                              src={group.avatar}
                              alt={`${group.name} Avatar`}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span className="text-sm">
                              {group.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900 text-sm truncate">
                          {group.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {group.memberCount} member
                          {group.memberCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Borrowed Tab Content */}
            {activeTab === "borrowed" && (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 text-2xl">📋</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No borrowed gear
                </h3>
                <p className="text-gray-500">
                  Items you've borrowed from others will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
