import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import apiClient from "../utils/apiClient";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import ManageGroupsModal from "../components/ManageGroupsModal";
import AddGearToGroupModal from "../components/AddGearToGroupModal";
import BorrowRequestModal from "../components/BorrowRequestModal";
import axios from "axios";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  ArrowLeft,
  UserPlus,
  Trash2,
  Package,
  Plus,
  X,
  Mail,
  Search,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  name?: string;
}

interface GroupMember {
  id: string;
  userId: string;
  role: string;
  user: User;
}

interface Gear {
  id: string;
  title: string;
  description: string;
  image?: string;
  ownerId: string;
  owner: User;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  createdById: string;
  members: GroupMember[];
  resources: Array<{
    id: string;
    resource: Gear;
  }>;
  memberCount: number;
  sharedResourcesCount: number;
  userPermissions: {
    canEdit: boolean;
    canDelete: boolean;
    canInvite: boolean;
    canRemoveMembers: boolean;
    canTransferOwnership: boolean;
  };
}

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useFirebaseAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [manageResourceId, setManageResourceId] = useState<string | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showAddGearModal, setShowAddGearModal] = useState(false);
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"items" | "members" | "activity">(
    "items",
  );
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      setLoading(false);
      navigate("/");
      return;
    }
  }, [user, authLoading, navigate]);

  const fetchGroupDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/groups/${groupId}/details`, {
        params: { userId: user?.uid },
      });
      console.log("[fetchGroupDetails] Group data received:", response.data);
      console.log("[fetchGroupDetails] Resources:", response.data.resources);
      setGroup(response.data);
    } catch (error: unknown) {
      console.error("Error fetching group details:", error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          setError("You don't have permission to view this group");
        } else if (error.response?.status === 404) {
          setError("Group not found");
        } else {
          setError("Failed to load group details");
        }
      } else {
        setError("Failed to load group details");
      }
    } finally {
      setLoading(false);
    }
  }, [user?.uid, groupId]);

  useEffect(() => {
    if (user && groupId) {
      fetchGroupDetails();
    }
  }, [user, groupId, fetchGroupDetails]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !user || !groupId) return;

    try {
      setInviting(true);
      const response = await apiClient.post(`/api/groups/${groupId}/invite`, {
        email: inviteEmail.toLowerCase(),
        invitedBy: user.uid,
      });

      if (response.data.success) {
        alert(`Successfully invited ${inviteEmail}`);
        setInviteEmail("");
        setShowInviteForm(false);
        fetchGroupDetails(); // Refresh group data
      }
    } catch (error: unknown) {
      console.error("Error inviting user:", error);
      let message = "Failed to invite user";
      if (axios.isAxiosError(error)) {
        message =
          error.response?.data?.message ||
          error.response?.data?.error ||
          message;
      }
      alert(message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (
      !confirm(`Are you sure you want to remove ${memberName} from the group?`)
    ) {
      return;
    }

    try {
      await apiClient.delete(`/api/groups/${groupId}/remove-member`, {
        data: {
          userId: user?.uid,
          targetUserId: memberId,
        },
      });

      alert(`${memberName} has been removed from the group`);
      fetchGroupDetails(); // Refresh group data
    } catch (error: unknown) {
      console.error("Error removing member:", error);
      let message = "Failed to remove member";
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.error || message;
      }
      alert(message);
    }
  };

  // Remove resource from this group only
  const handleRemoveFromGroup = async (resourceId: string) => {
    console.log("[handleRemoveFromGroup] Starting removal", {
      resourceId,
      groupId,
      userId: user?.uid,
    });

    if (
      !confirm("Remove this item from the group? (It will stay in your gear)")
    )
      return;

    try {
      console.log("[handleRemoveFromGroup] Making API call...");
      const response = await apiClient.delete(
        `/api/resources/${resourceId}/groups/${groupId}`,
        {
          data: { userId: user?.uid },
        },
      );
      console.log("[handleRemoveFromGroup] Success:", response.data);
      alert("Resource removed from group");
      fetchGroupDetails();
    } catch (error: unknown) {
      console.error(
        "[handleRemoveFromGroup] Error removing resource from group:",
        error,
      );
      if (axios.isAxiosError(error)) {
        console.error("Error response:", error.response?.data);
        const errorMsg =
          error.response?.data?.error || "Failed to remove resource from group";
        alert(errorMsg);
      } else {
        alert("Failed to remove resource from group");
      }
    }
  };

  // Edit a shared resource (simple prompt-based flow)
  const handleEditResource = async (resource: {
    id: string;
    title: string;
    description: string;
    image?: string;
  }) => {
    const newTitle = prompt("Edit title:", resource.title);
    if (!newTitle) return;
    const newDescription = prompt("Edit description:", resource.description);
    if (!newDescription) return;
    try {
      const resp = await apiClient.put(`/api/resources/${resource.id}`, {
        title: newTitle,
        description: newDescription,
      });
      alert("Resource updated");
      fetchGroupDetails();
      try {
        window.dispatchEvent(
          new CustomEvent("resource:updated", {
            detail: { resource: resp.data },
          }),
        );
      } catch (_err) {
        console.debug("[GroupDetail] dispatch resource:updated failed", _err);
      }
    } catch (error: unknown) {
      console.error("Error updating resource:", error);
      alert("Failed to update resource");
    }
  };

  // Handle request to borrow
  const handleRequestBorrow = (gearId: string) => {
    const resource = group?.resources.find((r) => r.resource.id === gearId);
    if (resource) {
      setSelectedResource({
        id: resource.resource.id,
        title: resource.resource.title,
      });
      setBorrowModalOpen(true);
    } else {
      console.error("[GroupDetail] Resource not found for id:", gearId);
    }
  };

  const handleUpdateRole = async (
    memberId: string,
    newRole: string,
    memberName: string,
  ) => {
    try {
      const response = await apiClient.put(
        `/api/groups/${groupId}/members/${memberId}/role`,
        {
          requesterId: user?.uid,
          role: newRole,
        },
      );

      if (response.data.success) {
        alert(`Successfully updated ${memberName}'s role to ${newRole}`);
        fetchGroupDetails(); // Refresh group data
      }
    } catch (error: unknown) {
      console.error("Error updating member role:", error);
      let message = "Failed to update member role";
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.error || message;
      }
      alert(message);
    }
  };

  const deleteGroup = async () => {
    if (!group || !user) return;

    if (
      !confirm(
        `Are you sure you want to delete "${group.name}"? This action cannot be undone and will remove all shared gear from this group.`,
      )
    ) {
      return;
    }

    try {
      await apiClient.delete(`/api/groups/${group.id}`, {
        data: { userId: user.uid },
      });

      alert(`✅ Group "${group.name}" has been deleted successfully`);
      navigate("/groups");
    } catch (error) {
      console.error("Error deleting group:", error);
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        alert(`❌ ${error.response.data.message}`);
      } else {
        alert("❌ Failed to delete group. Please try again.");
      }
    }
  };

  // GroupItemCard component for the new design
  const GroupItemCard: React.FC<{
    item: Gear;
    isOwner: boolean;
  }> = ({ item, isOwner }) => {
    // For now, we'll show all items as available since we don't have borrowing status
    const isAvailable = true;

    console.log("[GroupItemCard]", {
      itemId: item.id,
      itemTitle: item.title,
      isOwner,
      ownerId: item.ownerId,
      currentUserId: user?.uid,
    });

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full"
      >
        <div className="relative aspect-square">
          <img
            src={item.image || "https://via.placeholder.com/400?text=No+Image"}
            alt={item.title}
            className={`w-full h-full object-cover ${!isAvailable ? "grayscale-[0.5] opacity-80" : ""}`}
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-3 left-3">
            <div
              className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider shadow-sm border ${
                isAvailable
                  ? "bg-cyan-500 text-white border-cyan-600"
                  : "bg-slate-800/80 text-white border-slate-700 backdrop-blur-md"
              }`}
            >
              {isAvailable ? "Available" : "In Use"}
            </div>
          </div>
        </div>

        <div className="p-3.5 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-1">
            <h4 className="font-bold text-slate-900 text-sm truncate flex-1">
              {item.title}
            </h4>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] text-slate-400 truncate">
              Owned by {(item.owner.name || item.owner.email).split(" ")[0]}
            </span>
          </div>

          {isOwner ? (
            <div className="flex flex-col gap-2 mt-auto">
              <button
                onClick={() => handleEditResource(item)}
                className="w-full py-2.5 rounded-lg text-xs font-semibold transition-all bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Edit
              </button>
              <button
                onClick={() => handleRemoveFromGroup(item.id)}
                className="w-full py-2.5 rounded-lg text-xs font-semibold transition-all bg-orange-50 text-orange-600 hover:bg-orange-100"
              >
                Remove from group
              </button>
            </div>
          ) : (
            <button
              disabled={!isAvailable}
              onClick={() => handleRequestBorrow(item.id)}
              className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-all mt-auto ${
                isAvailable
                  ? "bg-cyan-400 text-white hover:bg-cyan-500"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              {isAvailable ? "Request to Borrow" : "Notify when back"}
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-200 border-t-cyan-600 mx-auto mb-4"></div>
          <p className="mt-4 text-gray-600 font-medium">
            Loading group details...
          </p>
        </div>
        {/* Manage groups modal for resources */}
        {manageResourceId && user && (
          <ManageGroupsModal
            open={showManageModal}
            userId={user.uid}
            resourceId={manageResourceId}
            onClose={() => {
              setShowManageModal(false);
              setManageResourceId(null);
            }}
            onSaved={() => fetchGroupDetails()}
          />
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-3xl shadow-sm border border-red-100 p-12 max-w-md">
          <div className="mb-4 flex justify-center">
            <div className="bg-red-100 p-4 rounded-full">
              <X className="w-10 h-10 text-red-600" />
            </div>
          </div>
          <p className="text-red-600 text-lg mb-6 font-semibold">{error}</p>
          <Link
            to="/groups"
            className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Groups
          </Link>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-3xl shadow-sm border border-gray-200 p-12 max-w-md">
          <div className="mb-4 flex justify-center">
            <div className="bg-gray-100 p-4 rounded-full">
              <Users className="w-10 h-10 text-gray-400" />
            </div>
          </div>
          <p className="text-gray-600 text-lg mb-6 font-semibold">
            Group not found
          </p>
          <Link
            to="/groups"
            className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Groups
          </Link>
        </div>
      </div>
    );
  }

  const userRole =
    group.members.find((m) => m.userId === user?.uid)?.role || "MEMBER";
  const isOwner = userRole.toUpperCase() === "OWNER";
  const canManageMembers = isOwner;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-24">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Button */}
        <Link
          to="/groups"
          className="text-slate-400 hover:text-slate-600 mb-6 inline-flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Groups
        </Link>

        {/* Group Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-slate-900">{group.name}</h1>
            <span className="bg-cyan-50 text-cyan-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
              {userRole}
            </span>
          </div>
          {group.description && (
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              {group.description}
            </p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-white/20">
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block mb-1">
              Total Items
            </span>
            <span className="text-2xl font-bold text-slate-900">
              {group.sharedResourcesCount}
            </span>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-white/20">
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block mb-1">
              Members
            </span>
            <span className="text-2xl font-bold text-slate-900">
              {group.memberCount}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/50 p-1 rounded-2xl flex gap-1 mb-8">
          <button
            onClick={() => setActiveTab("items")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === "items"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Items
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === "members"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Members
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === "activity"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Activity
          </button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "items" && (
            <motion.div
              key="items"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Search Bar */}
              {group.resources.length > 0 && (
                <div className="relative mb-2">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Search items in this group..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all shadow-sm"
                  />
                </div>
              )}

              {/* Action Buttons */}
              {group.userPermissions.canInvite &&
                group.resources.length > 0 && (
                  <div className="flex justify-end gap-2 mb-4">
                    <button
                      onClick={() => setShowAddGearModal(true)}
                      className="bg-cyan-400 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Gear
                    </button>
                    <Link
                      to="/post"
                      className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Share New
                    </Link>
                  </div>
                )}

              {/* Items Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {(() => {
                  const filteredResources = group.resources.filter(
                    ({ resource }) =>
                      resource.title
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      resource.description
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()),
                  );

                  if (
                    filteredResources.length === 0 &&
                    group.resources.length === 0
                  ) {
                    return (
                      <div className="col-span-full text-center py-10 text-slate-400">
                        <Plus size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm font-medium mb-4">
                          No items shared in this group yet.
                        </p>
                        {group.userPermissions.canInvite && (
                          <div className="flex justify-center gap-3 mt-6">
                            <button
                              onClick={() => setShowAddGearModal(true)}
                              className="bg-cyan-400 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Add Existing Gear
                            </button>
                            <Link
                              to="/post"
                              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Share New Gear
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (filteredResources.length === 0 && searchQuery) {
                    return (
                      <div className="col-span-full text-center py-10 text-slate-400">
                        <Search size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm font-medium">
                          No items match your search.
                        </p>
                      </div>
                    );
                  }

                  return filteredResources.map(({ resource }) => (
                    <GroupItemCard
                      key={resource.id}
                      item={resource}
                      isOwner={resource.ownerId === user?.uid}
                    />
                  ));
                })()}
              </div>
            </motion.div>
          )}

          {activeTab === "members" && (
            <motion.div
              key="members"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Invite Button */}
              {group.userPermissions.canInvite && !showInviteForm && (
                <button
                  onClick={() => setShowInviteForm(true)}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm font-bold flex items-center justify-center gap-2 hover:border-slate-300 hover:text-slate-500 transition-all"
                >
                  <UserPlus size={18} /> Invite New Member
                </button>
              )}

              {/* Invite Form */}
              <AnimatePresence>
                {showInviteForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mb-4 overflow-hidden"
                  >
                    <form
                      onSubmit={handleInvite}
                      className="bg-white p-4 rounded-2xl shadow-sm border border-white/20"
                    >
                      <div className="flex gap-3">
                        <div className="flex-1 relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="Enter email address"
                            className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={inviting}
                          className="bg-cyan-400 text-white px-6 py-3 rounded-xl hover:bg-cyan-500 disabled:opacity-50 transition-colors font-semibold flex items-center gap-2"
                        >
                          {inviting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Inviting...
                            </>
                          ) : (
                            <>Send</>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowInviteForm(false);
                            setInviteEmail("");
                          }}
                          className="bg-slate-100 text-slate-700 px-5 py-3 rounded-xl hover:bg-slate-200 transition-colors font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Members List */}
              {group.members.map((member) => (
                <div
                  key={member.id}
                  className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-white/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white text-sm font-semibold">
                      {(member.user.name || member.user.email)
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {member.user.name || member.user.email}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                        {member.role}
                      </p>
                    </div>
                  </div>

                  {canManageMembers &&
                    member.userId !== user?.uid &&
                    member.role.toUpperCase() !== "OWNER" && (
                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleUpdateRole(
                              member.userId,
                              e.target.value,
                              member.user.name || member.user.email,
                            )
                          }
                          className="text-xs border-2 border-slate-200 rounded-lg px-2 py-1.5 font-medium focus:border-cyan-400 focus:outline-none"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() =>
                            handleRemoveMember(
                              member.userId,
                              member.user.name || member.user.email,
                            )
                          }
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                          title="Remove member"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                </div>
              ))}

              {/* Delete Group Button */}
              {group.userPermissions.canDelete && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <button
                    onClick={deleteGroup}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 px-4 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Group
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 pl-4 border-l-2 border-slate-100 ml-2"
            >
              <div className="flex flex-col items-center justify-center py-20 -ml-4 border-0">
                <div className="mb-6 w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                  <Package className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-slate-400 text-sm font-medium">
                  Activity feed coming soon.
                </p>
                <p className="text-slate-300 text-xs mt-2">
                  Track borrows, returns, and member activity
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modals */}
        {showAddGearModal && group && user && (
          <AddGearToGroupModal
            open={showAddGearModal}
            groupId={group.id}
            userId={user.uid}
            onClose={() => setShowAddGearModal(false)}
            onSaved={() => {
              fetchGroupDetails();
              setShowAddGearModal(false);
            }}
          />
        )}
        {selectedResource && user && groupId && (
          <BorrowRequestModal
            isOpen={borrowModalOpen}
            onClose={() => {
              setBorrowModalOpen(false);
              setSelectedResource(null);
            }}
            resourceId={selectedResource.id}
            resourceTitle={selectedResource.title}
            userId={user.uid}
            groupId={groupId}
          />
        )}
        {manageResourceId && user && (
          <ManageGroupsModal
            open={showManageModal}
            userId={user.uid}
            resourceId={manageResourceId}
            onClose={() => {
              setShowManageModal(false);
              setManageResourceId(null);
            }}
            onSaved={() => fetchGroupDetails()}
          />
        )}
      </div>
    </div>
  );
}
