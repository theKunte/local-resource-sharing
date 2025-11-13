import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import GearCard from "../components/GearCard";
import ManageGroupsModal from "../components/ManageGroupsModal";
import AddGearToGroupModal from "../components/AddGearToGroupModal";

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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
      return;
    }
  }, [user, authLoading, navigate]);

  const fetchGroupDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:3001/api/groups/${groupId}/details`,
        {
          params: { userId: user?.uid },
        }
      );
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
      const response = await axios.post(
        `http://localhost:3001/api/groups/${groupId}/invite`,
        {
          email: inviteEmail.toLowerCase(),
          invitedBy: user.uid,
        }
      );

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
      await axios.delete(
        `http://localhost:3001/api/groups/${groupId}/remove-member`,
        {
          data: {
            userId: user?.uid,
            targetUserId: memberId,
          },
        }
      );

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
      await axios.delete(`http://localhost:3001/api/resources/${resourceId}`, {
        data: { userId: user?.uid },
      });
      alert("Resource deleted");
      fetchGroupDetails();
      try {
        window.dispatchEvent(
          new CustomEvent("resource:deleted", { detail: { id: resourceId } })
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
      const resp = await axios.put(
        `http://localhost:3001/api/resources/${resource.id}`,
        {
          title: newTitle,
          description: newDescription,
        }
      );
      alert("Resource updated");
      fetchGroupDetails();
      try {
        window.dispatchEvent(
          new CustomEvent("resource:updated", {
            detail: { resource: resp.data },
          })
        );
      } catch (_err) {
        console.debug("[GroupDetail] dispatch resource:updated failed", _err);
      }
    } catch (error: unknown) {
      console.error("Error updating resource:", error);
      alert("Failed to update resource");
    }
  };

  const handleUpdateRole = async (
    memberId: string,
    newRole: string,
    memberName: string
  ) => {
    try {
      const response = await axios.put(
        `http://localhost:3001/api/groups/${groupId}/members/${memberId}/role`,
        {
          requesterId: user?.uid,
          role: newRole,
        }
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
        `Are you sure you want to delete "${group.name}"? This action cannot be undone and will remove all shared gear from this group.`
      )
    ) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3001/api/groups/${group.id}`, {
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading group details...</p>
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <Link
            to="/groups"
            className="text-emerald-600 hover:text-emerald-700 underline"
          >
            Back to Groups
          </Link>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Group not found</p>
          <Link
            to="/groups"
            className="text-emerald-600 hover:text-emerald-700 underline"
          >
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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/groups"
            className="text-emerald-600 hover:text-emerald-700 mb-4 inline-flex items-center"
          >
            ← Back to Groups
          </Link>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                {group.avatar ? (
                  <img
                    src={group.avatar}
                    alt={group.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-slate-200"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {group.name}
                  </h1>
                  {group.description && (
                    <p className="text-slate-600 mt-1">{group.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                    <span>{group.memberCount} members</span>
                    <span>{group.sharedResourcesCount} shared items</span>
                    <span className="capitalize text-emerald-600 font-medium">
                      Your role: {userRole}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {group.userPermissions.canInvite && (
                  <button
                    onClick={() => setShowInviteForm(!showInviteForm)}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Invite Member
                  </button>
                )}

                {group.userPermissions.canDelete && (
                  <button
                    onClick={deleteGroup}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete Group
                  </button>
                )}
              </div>
            </div>

            {/* Invite Form */}
            {showInviteForm && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <form onSubmit={handleInvite} className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={inviting}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {inviting ? "Inviting..." : "Invite"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteForm(false);
                      setInviteEmail("");
                    }}
                    className="bg-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-400 transition-colors"
                  >
                    Cancel
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Members Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Members ({group.memberCount})
              </h2>

              <div className="space-y-3">
                {group.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                        {(member.user.name || member.user.email)
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {member.user.name || member.user.email}
                        </p>
                        <p className="text-sm text-slate-500">
                          {member.user.email}
                        </p>
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            member.role === "owner"
                              ? "bg-purple-100 text-purple-700"
                              : member.role === "admin"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {member.role}
                        </span>
                      </div>
                    </div>

                    {canManageMembers &&
                      member.userId !== user?.uid &&
                      member.role !== "owner" && (
                        <div className="flex items-center space-x-2">
                          {/* Role toggle for non-owners */}
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleUpdateRole(
                                member.userId,
                                e.target.value,
                                member.user.name || member.user.email
                              )
                            }
                            className="text-xs border border-slate-300 rounded px-2 py-1"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() =>
                              handleRemoveMember(
                                member.userId,
                                member.user.name || member.user.email
                              )
                            }
                            className="text-red-600 hover:text-red-700 text-sm"
                            title="Remove member"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Shared Gear Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Shared Gear ({group.sharedResourcesCount})
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddGearModal(true)}
                    className="bg-sky-600 text-white px-3 py-2 rounded-lg hover:bg-sky-700 transition-colors text-sm"
                  >
                    Add Gear
                  </button>
                  <Link
                    to="/post"
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                  >
                    Share New Gear
                  </Link>
                </div>
              </div>

              {group.resources.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📦</span>
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    No shared gear yet
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Members can share their gear with this group to make it
                    available to everyone.
                  </p>
                  <Link
                    to="/post"
                    className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Share Your First Item
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 px-2 sm:px-4 md:px-6">
                  {group.resources.map(({ resource }) => (
                    <div key={resource.id} className="relative">
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
                      />
                      {/* Owner info overlay */}
                      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-slate-600">
                        <span className="font-medium">
                          {resource.owner.name || resource.owner.email}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
      </div>
    </div>
  );
}
