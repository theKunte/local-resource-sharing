import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import apiClient from "../utils/apiClient";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import GearCard from "../components/GearCard";
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
  Shield,
  Crown,
  User as UserIcon,
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

  useEffect(() => {
    if (!authLoading && !user) {
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

  // Delete a shared resource from the group (only owner can)
  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await apiClient.delete(`/api/resources/${resourceId}`, {
        data: { userId: user?.uid },
      });
      alert("Resource deleted");
      fetchGroupDetails();
      try {
        window.dispatchEvent(
          new CustomEvent("resource:deleted", { detail: { id: resourceId } }),
        );
      } catch (_err) {
        console.debug("[GroupDetail] dispatch resource:deleted failed", _err);
      }
    } catch (error: unknown) {
      console.error("Error deleting resource:", error);
      alert("Failed to delete resource");
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sage-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-sage-200 border-t-sage-600 mx-auto mb-4"></div>
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
      <div className="min-h-screen bg-gradient-to-br from-sage-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-3xl shadow-sm border border-red-100 p-12 max-w-md">
          <div className="mb-4 flex justify-center">
            <div className="bg-red-100 p-4 rounded-full">
              <X className="w-10 h-10 text-red-600" />
            </div>
          </div>
          <p className="text-red-600 text-lg mb-6 font-semibold">{error}</p>
          <Link
            to="/groups"
            className="inline-flex items-center gap-2 text-sage-600 hover:text-sage-700 font-medium transition-colors"
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
      <div className="min-h-screen bg-gradient-to-br from-sage-50 via-white to-slate-50 flex items-center justify-center">
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
            className="inline-flex items-center gap-2 text-sage-600 hover:text-sage-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Groups
          </Link>
        </div>
      </div>
    );
  }

  const userRole =
    group.members.find((m) => m.userId === user?.uid)?.role || "member";
  const isOwner = userRole === "owner";
  const canManageMembers = isOwner;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8 pb-48 lg:pb-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/groups"
            className="text-sage-600 hover:text-sage-700 mb-6 inline-flex items-center gap-2 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Groups
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl shadow-sm border border-sage-100 p-8"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-5">
                {group.avatar ? (
                  <img
                    src={group.avatar}
                    alt={group.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-sage-200"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-sage-400 to-sage-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-sm">
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {group.name}
                  </h1>
                  {group.description && (
                    <p className="text-gray-600 mb-3">{group.description}</p>
                  )}
                  <div className="flex items-center gap-5 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {group.memberCount} members
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Package className="w-4 h-4" />
                      {group.sharedResourcesCount} shared items
                    </span>
                    <span className="flex items-center gap-1.5 capitalize text-sage-600 font-semibold">
                      {userRole === "owner" ? (
                        <Crown className="w-4 h-4" />
                      ) : userRole === "admin" ? (
                        <Shield className="w-4 h-4" />
                      ) : (
                        <UserIcon className="w-4 h-4" />
                      )}
                      {userRole}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {group.userPermissions.canInvite && (
                  <button
                    onClick={() => setShowInviteForm(!showInviteForm)}
                    className="bg-sage-600 text-white px-5 py-2.5 rounded-xl hover:bg-sage-700 transition-colors font-medium flex items-center gap-2 shadow-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite Member
                  </button>
                )}

                {group.userPermissions.canDelete && (
                  <button
                    onClick={deleteGroup}
                    className="bg-red-600 text-white px-5 py-2.5 rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center gap-2 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Group
                  </button>
                )}
              </div>
            </div>

            {/* Invite Form */}
            <AnimatePresence>
              {showInviteForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-6 pt-6 border-t border-sage-100 overflow-hidden"
                >
                  <form onSubmit={handleInvite} className="flex gap-3">
                    <div className="flex-1 relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Enter email address"
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-sage-500 focus:border-sage-500 transition-all"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={inviting}
                      className="bg-sage-600 text-white px-6 py-3 rounded-xl hover:bg-sage-700 disabled:opacity-50 transition-colors font-medium flex items-center gap-2"
                    >
                      {inviting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Inviting...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Invite
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInviteForm(false);
                        setInviteEmail("");
                      }}
                      className="bg-gray-100 text-gray-700 px-5 py-3 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Members Section */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-white rounded-3xl shadow-sm border border-sage-100 p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-sage-100 p-2 rounded-xl">
                  <Users className="w-5 h-5 text-sage-700" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Members ({group.memberCount})
                </h2>
              </div>

              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {group.members.map((member, index) => (
                    <motion.div
                      key={member.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-sage-50 to-transparent rounded-2xl hover:from-sage-100 transition-all"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-11 h-11 bg-gradient-to-br from-sage-400 to-sage-600 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-sm flex-shrink-0">
                          {(member.user.name || member.user.email)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {member.user.name || member.user.email}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {member.user.email}
                          </p>
                          <div className="mt-1.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wide ${
                                member.role === "owner"
                                  ? "bg-purple-100 text-purple-700"
                                  : member.role === "admin"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {member.role === "owner" ? (
                                <Crown className="w-3 h-3" />
                              ) : member.role === "admin" ? (
                                <Shield className="w-3 h-3" />
                              ) : (
                                <UserIcon className="w-3 h-3" />
                              )}
                              {member.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      {canManageMembers &&
                        member.userId !== user?.uid &&
                        member.role !== "owner" && (
                          <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                            {/* Role toggle for non-owners */}
                            <select
                              value={member.role}
                              onChange={(e) =>
                                handleUpdateRole(
                                  member.userId,
                                  e.target.value,
                                  member.user.name || member.user.email,
                                )
                              }
                              className="text-xs border-2 border-gray-200 rounded-lg px-2 py-1.5 font-medium focus:border-sage-400 focus:outline-none"
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
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          {/* Shared Gear Section */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-white rounded-3xl shadow-sm border border-sage-100 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-sage-100 p-2 rounded-xl">
                    <Package className="w-5 h-5 text-sage-700" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Shared Gear ({group.sharedResourcesCount})
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowAddGearModal(true)}
                    className="bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Gear
                  </button>
                  <Link
                    to="/post"
                    className="bg-sage-600 text-white px-4 py-2.5 rounded-xl hover:bg-sage-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Share New Gear
                  </Link>
                </div>
              </div>

              {group.resources.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className="text-center py-16"
                >
                  <div className="mb-5 flex justify-center">
                    <div className="bg-sage-100 p-6 rounded-full">
                      <Package
                        className="w-12 h-12 text-sage-600"
                        strokeWidth={1.5}
                      />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No shared gear yet
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Members can share their gear with this group to make it
                    available to everyone.
                  </p>
                  <Link
                    to="/post"
                    className="inline-flex items-center gap-2 bg-sage-600 text-white px-6 py-3 rounded-xl hover:bg-sage-700 transition-colors font-medium shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Share Your First Item
                  </Link>
                </motion.div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 px-2 sm:px-4 md:px-6 mb-32">
                  <AnimatePresence mode="popLayout">
                    {group.resources.map(({ resource }, index) => (
                      <motion.div
                        key={resource.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className="relative"
                      >
                        <GearCard
                          id={resource.id}
                          title={resource.title}
                          description={resource.description}
                          image={resource.image}
                          showActions={resource.ownerId === user?.uid}
                          onDelete={
                            resource.ownerId === user?.uid
                              ? handleDeleteResource
                              : undefined
                          }
                          onEdit={
                            resource.ownerId === user?.uid
                              ? handleEditResource
                              : undefined
                          }
                          onManageGroups={
                            resource.ownerId === user?.uid
                              ? () => {
                                  setManageResourceId(resource.id);
                                  setShowManageModal(true);
                                }
                              : undefined
                          }
                          onRequestBorrow={
                            resource.ownerId !== user?.uid
                              ? handleRequestBorrow
                              : undefined
                          }
                        />
                        {/* Owner info overlay */}
                        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm">
                          {resource.owner.name || resource.owner.email}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </div>
        </div>
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
      </div>
    </div>
  );
}
