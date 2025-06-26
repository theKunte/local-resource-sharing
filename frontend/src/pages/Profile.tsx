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
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
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
        .then((res) => setGear(res.data));

      // Load user's groups with member details
      setLoadingGroups(true);
      axios
        .get(`http://localhost:3001/api/groups?userId=${user.uid}`)
        .then(async (res) => {
          // Get detailed info for each group including members
          const groupsWithDetails = await Promise.all(
            res.data.map(async (group: Group) => {
              try {
                const membersResponse = await axios.get(`http://localhost:3001/api/groups/${group.id}/members`);
                return {
                  ...group,
                  memberCount: membersResponse.data.length,
                  members: membersResponse.data
                };
              } catch (error) {
                console.error(`Error loading members for group ${group.id}:`, error);
                return { ...group, memberCount: 0, members: [] };
              }
            })
          );
          setUserGroups(groupsWithDetails);
        })
        .catch((err) => console.error("Error loading groups:", err))
        .finally(() => setLoadingGroups(false));
    }
  }, [user]);

  // Delete resource handler
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this resource?"))
      return;
    await axios.delete(`http://localhost:3001/api/resources/${id}`);
    setGear((prev) => prev.filter((r) => r.id !== id));  };
  
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
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Sidebar */}
      <aside className="lg:w-56 border-b lg:border-b-0 lg:border-r border-gray-200 p-4 lg:p-6 flex lg:flex-col gap-4 overflow-x-auto lg:overflow-x-visible">        <h2 className="text-lg lg:text-xl font-bold mb-0 lg:mb-8 whitespace-nowrap">GearShare</h2>
        <nav className="flex lg:flex-col gap-4 lg:gap-2 whitespace-nowrap">
          <a href="/" className="hover:underline text-sm lg:text-base">
            Home
          </a>
          <a href="/post" className="hover:underline text-sm lg:text-base">
            Share Gear
          </a>
          <a href="/find" className="hover:underline text-sm lg:text-base">
            Browse Gear
          </a>
          <a href="/groups" className="hover:underline text-sm lg:text-base">
            Groups
          </a>
        </nav>
      </aside>
      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-full overflow-hidden">        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 lg:gap-8 mb-6 lg:mb-10">
          <div className="flex flex-col items-center sm:items-start">
            <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full bg-gray-200 flex items-center justify-center text-lg sm:text-xl lg:text-2xl font-bold mb-2 border">
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
            <span className="text-base sm:text-lg font-semibold mt-2 text-center sm:text-left">
              {user.displayName || user.email}
            </span>
            <span className="text-gray-500 text-sm text-center sm:text-left">Full Name</span>
          </div>
          <div className="flex-1 flex flex-col gap-4 justify-center">            <div className="flex justify-center sm:justify-start gap-4 sm:gap-6 lg:gap-8 text-sm sm:text-base lg:text-lg">
              <span className="text-center">
                <span className="font-bold">{gear.length}</span><br className="sm:hidden" />
                <span className="sm:ml-1">Gear</span>
              </span>
              <span className="text-center">
                <span className="font-bold">{loadingGroups ? "..." : userGroups.length}</span><br className="sm:hidden" />
                <span className="sm:ml-1">Groups</span>
              </span>              <span className="text-center">
                <span className="font-bold">{gear.length}</span><br className="sm:hidden" />
                <span className="sm:ml-1">Shared</span>
              </span>
            </div>
            <div className="flex gap-3">
              <Link
                to="/groups"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
              >
                <span className="mr-1">👥</span>
                Manage Groups
              </Link>
              <button className="text-emerald-600 font-semibold hover:underline text-center sm:text-left text-sm">
                Edit Profile
              </button>
            </div>
          </div>
        </div>        {/* Groups Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Your Groups</h3>
            <Link
              to="/groups"
              className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
            >
              Manage All →
            </Link>
          </div>
          
          {loadingGroups ? (
            <div className="flex justify-center py-4">
              <div className="text-gray-500">Loading groups...</div>
            </div>
          ) : userGroups.length === 0 ? (
            <div className="text-center py-8 px-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <span className="text-4xl mb-3 block">👥</span>
              <h4 className="font-semibold text-gray-700 mb-2">No groups yet</h4>
              <p className="text-gray-500 text-sm mb-4">Create your first group to start sharing gear with friends!</p>
              <Link
                to="/groups"
                className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                <span className="mr-2">+</span>
                Create Group
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 sm:gap-6">
              {userGroups.slice(0, 6).map((group) => (
                <div key={group.id} className="flex flex-col items-center">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 mb-2 flex items-center justify-center font-bold text-sm sm:text-base lg:text-lg text-white overflow-hidden border-2 border-emerald-300 shadow-lg">
                    {group.avatar ? (
                      <img
                        src={group.avatar}
                        alt={`${group.name} Avatar`}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span>{group.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-700 font-bold tracking-wide uppercase mt-1 text-center max-w-16 sm:max-w-20 break-words leading-tight">
                    {group.name.length > 8 ? `${group.name.slice(0, 8)}...` : group.name}
                  </span>
                  {group.memberCount !== undefined && (
                    <span className="text-xs text-gray-500 mt-1">
                      {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              ))}
              
              {userGroups.length < 6 && (
                <Link
                  to="/groups"
                  className="flex flex-col items-center focus:outline-none group"
                  title="Create Group"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg sm:text-xl lg:text-2xl mb-2 border-2 border-gray-300 border-dashed shadow group-hover:border-gray-400 transition-colors">
                    +
                  </div>
                  <span className="text-xs text-gray-700 font-bold tracking-wide uppercase mt-1 text-center max-w-16 sm:max-w-20 break-words">
                    New
                  </span>
                </Link>
              )}
            </div>
          )}
        </div>
        
        <hr className="mb-6 sm:mb-8" />
        
        {/* Posted Gear Section */}
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-3">🎒</span>
            Your Shared Gear
            {gear.length > 0 && (
              <span className="ml-3 text-lg font-normal text-gray-500">
                ({gear.length} item{gear.length !== 1 ? 's' : ''})
              </span>
            )}
          </h2>
          
          {/* Gear Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
            {gear.length === 0 ? (
              <div className="col-span-full">
                <div className="text-center py-12 px-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <span className="text-5xl mb-4 block">📦</span>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No gear shared yet</h3>
                  <p className="text-gray-500 mb-4">Start sharing your outdoor gear with trusted friends!</p>
                  <button
                    onClick={() => window.location.href = '/post'}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
                  >
                    <span className="mr-2">🏔️</span>
                    Share Your First Gear
                  </button>
                </div>
              </div>
            ) : (
              gear.map((item) => (
                <GearCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  description={item.description}
                  image={item.image}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
