import { useState, useEffect } from "react";
import axios from "axios";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { useNavigate } from "react-router-dom";
import { cropImageToSquare } from "../utils/cropImageToSquare";

interface Group {
  id: string;
  name: string;
  description?: string;
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
  userPermissions?: {
    canEdit: boolean;
    canDelete: boolean;
    canInvite: boolean;
    canRemoveMembers: boolean;
    canTransferOwnership: boolean;
  };
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDescription, setEditGroupDescription] = useState("");
  const [updating, setUpdating] = useState(false);
  const [managingGroup, setManagingGroup] = useState<Group | null>(null);

  const { user, loading: authLoading } = useFirebaseAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);
  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `http://localhost:3001/api/groups?userId=${user!.uid}`
        );

        // Get detailed info for each group including members
        const groupsWithDetails = await Promise.all(
          response.data.map(async (group: Group) => {
            try {
              const membersResponse = await axios.get(
                `http://localhost:3001/api/groups/${group.id}/members`
              );
              return {
                ...group,
                members: membersResponse.data,
                memberCount: membersResponse.data.length,
              };
            } catch (error) {
              console.error(
                `Error loading members for group ${group.id}:`,
                error
              );
              return { ...group, members: [], memberCount: 0 };
            }
          })
        );

        setGroups(groupsWithDetails);
      } catch (error) {
        console.error("Error loading groups:", error);
        alert("Failed to load groups. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadGroups();
    }
  }, [user]);
  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:3001/api/groups?userId=${user!.uid}`
      );

      // Get detailed info for each group including members
      const groupsWithDetails = await Promise.all(
        response.data.map(async (group: Group) => {
          try {
            const membersResponse = await axios.get(
              `http://localhost:3001/api/groups/${group.id}/members`
            );
            return {
              ...group,
              members: membersResponse.data,
              memberCount: membersResponse.data.length,
            };
          } catch (error) {
            console.error(
              `Error loading members for group ${group.id}:`,
              error
            );
            return { ...group, members: [], memberCount: 0 };
          }
        })
      );

      setGroups(groupsWithDetails);
    } catch (error) {
      console.error("Error loading groups:", error);
      alert("Failed to load groups. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      setCreating(true);
      await axios.post("http://localhost:3001/api/groups", {
        name: newGroupName.trim(),
        createdById: user!.uid,
      });

      setNewGroupName("");
      setShowCreateForm(false);
      await loadGroups();
      alert(`Group "${newGroupName}" created successfully!`);
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const inviteToGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedGroup) return;

    try {
      setInviting(true);
      const response = await axios.post(
        `http://localhost:3001/api/groups/${selectedGroup.id}/invite`,
        {
          email: inviteEmail.trim().toLowerCase(), // Normalize email
          invitedBy: user!.uid,
        }
      );

      setInviteEmail("");
      setSelectedGroup(null);

      // Show success message with the response message if available
      const successMessage =
        response.data.message ||
        `Successfully added ${inviteEmail} to the group!`;
      alert(`✅ ${successMessage}`);

      await loadGroups();
    } catch (error) {
      console.error("Error inviting user:", error);

      // Show specific error messages based on the response
      let errorMessage = "Failed to send invitation.";

      if (axios.isAxiosError(error) && error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          switch (error.response.data.error) {
            case "User not found":
              errorMessage = `No user found with email "${inviteEmail}". They need to sign up first using Google authentication.`;
              break;
            case "Already a member":
              errorMessage = `"${inviteEmail}" is already a member of this group.`;
              break;
            case "Invalid email format":
              errorMessage = "Please enter a valid email address.";
              break;
            case "You are not a member of this group":
              errorMessage =
                "You don't have permission to invite users to this group.";
              break;
            default:
              errorMessage = error.response.data.error;
          }
        }
      }

      alert(`❌ ${errorMessage}`);
    } finally {
      setInviting(false);
    }
  };

  const leaveGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Are you sure you want to leave "${groupName}"?`)) return;

    try {
      await axios.delete(
        `http://localhost:3001/api/groups/${groupId}/members/${user!.uid}`
      );
      await loadGroups();
      alert(`You've left "${groupName}"`);
    } catch (error) {
      console.error("Error leaving group:", error);
      alert("Failed to leave group. Please try again.");
    }
  };
  const [updatingAvatar, setUpdatingAvatar] = useState<string | null>(null);

  const updateGroupAvatar = async (
    groupId: string,
    avatarFile: File | null
  ) => {
    try {
      setUpdatingAvatar(groupId);
      let avatar = null;
      if (avatarFile) {
        avatar = await cropImageToSquare(avatarFile, 128);
      }

      await axios.put(`http://localhost:3001/api/groups/${groupId}`, {
        avatar,
        userId: user!.uid,
      });

      // Reload groups to reflect the change
      await loadGroups();
    } catch (error) {
      console.error("Error updating group avatar:", error);
      alert("Failed to update group avatar. Please try again.");
    } finally {
      setUpdatingAvatar(null);
    }
  };

  const deleteGroup = async (group: Group) => {
    if (
      !confirm(
        `Are you sure you want to delete "${group.name}"? This action cannot be undone and will remove all shared gear from this group.`
      )
    ) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3001/api/groups/${group.id}`, {
        data: { userId: user!.uid },
      });

      alert(`✅ Group "${group.name}" has been deleted successfully`);
      await loadGroups();
    } catch (error) {
      console.error("Error deleting group:", error);
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        alert(`❌ ${error.response.data.message}`);
      } else {
        alert("❌ Failed to delete group. Please try again.");
      }
    }
  };

  const openEditGroup = (group: Group) => {
    setEditingGroup(group);
    setEditGroupName(group.name);
    setEditGroupDescription(group.description || "");
  };

  const updateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;

    try {
      setUpdating(true);
      await axios.put(`http://localhost:3001/api/groups/${editingGroup.id}`, {
        name: editGroupName.trim(),
        description: editGroupDescription.trim(),
        userId: user!.uid,
      });

      setEditingGroup(null);
      setEditGroupName("");
      setEditGroupDescription("");
      alert("✅ Group updated successfully!");
      await loadGroups();
    } catch (error) {
      console.error("Error updating group:", error);
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        alert(`❌ ${error.response.data.message}`);
      } else {
        alert("❌ Failed to update group. Please try again.");
      }
    } finally {
      setUpdating(false);
    }
  };

  const removeMember = async (
    group: Group,
    memberId: string,
    memberName: string
  ) => {
    if (!confirm(`Remove ${memberName} from "${group.name}"?`)) return;

    try {
      await axios.delete(
        `http://localhost:3001/api/groups/${group.id}/remove-member`,
        {
          data: {
            userId: user!.uid,
            targetUserId: memberId,
          },
        }
      );

      alert(`✅ ${memberName} has been removed from the group`);
      await loadGroups();
      if (managingGroup?.id === group.id) {
        // Refresh the managing group data
        setManagingGroup(groups.find((g) => g.id === group.id) || null);
      }
    } catch (error) {
      console.error("Error removing member:", error);
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        alert(`❌ ${error.response.data.message}`);
      } else {
        alert("❌ Failed to remove member. Please try again.");
      }
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4"></div>
          <p className="text-gray-600">Loading your groups...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white py-12 mb-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="mb-4">
            <span className="text-5xl">👥</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Your Groups</h1>
          <p className="text-xl text-emerald-100 max-w-2xl mx-auto">
            Manage your trusted circles and share gear safely with friends
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-12">
        {/* Create Group Button */}
        <div className="mb-8 text-center">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
          >
            <span className="mr-2">➕</span>
            Create New Group
          </button>
        </div>

        {/* Create Group Form */}
        {showCreateForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Create a New Group
            </h3>
            <form onSubmit={createGroup} className="flex gap-4">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Seattle Hiking Friends, College Roommates"
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                required
              />
              <button
                type="submit"
                disabled={creating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Groups Grid */}
        {groups.length === 0 ? (
          <div className="text-center py-12 px-6 bg-white rounded-xl border-2 border-dashed border-gray-200">
            <span className="text-5xl mb-4 block">👥</span>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No groups yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first group to start sharing gear with trusted
              friends!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {" "}
            {groups.map((group) => (
              <div
                key={group.id}
                className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    {" "}
                    <div className="relative mr-4">
                      {" "}
                      <div
                        className={`w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden cursor-pointer relative ${
                          updatingAvatar === group.id ? "opacity-50" : ""
                        }`}
                        onContextMenu={(e) => {
                          if (group.createdById === user.uid && group.avatar) {
                            e.preventDefault();
                            if (confirm("Remove group avatar?")) {
                              updateGroupAvatar(group.id, null);
                            }
                          }
                        }}
                        title={
                          group.createdById === user.uid
                            ? group.avatar
                              ? "Click to change avatar, right-click to remove"
                              : "Click to add avatar"
                            : ""
                        }
                      >
                        {updatingAvatar === group.id && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                        {group.avatar ? (
                          <img
                            src={group.avatar}
                            alt={`${group.name} Avatar`}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <span>{group.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>{" "}
                      {group.createdById === user.uid && (
                        <label
                          className={`absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-600 hover:bg-emerald-700 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-lg ${
                            updatingAvatar === group.id
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <span className="text-white text-xs">📷</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={updatingAvatar === group.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              if (file && updatingAvatar !== group.id) {
                                updateGroupAvatar(group.id, file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {group.name}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        {group.memberCount} member
                        {group.memberCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Members List */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Members:
                    </h4>
                    <div className="space-y-1">
                      {group.members?.slice(0, 3).map((member) => (
                        <div
                          key={member.id}
                          className="text-sm text-gray-600 flex items-center"
                        >
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          {member.user.name || member.user.email}
                          {member.user.id === user.uid && " (You)"}
                        </div>
                      ))}
                      {group.memberCount! > 3 && (
                        <div className="text-sm text-gray-500">
                          +{group.memberCount! - 3} more...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={() => navigate(`/groups/${group.id}`)}
                      className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <span className="mr-1">👁️</span>
                      View Group
                    </button>

                    <button
                      onClick={() => setSelectedGroup(group)}
                      className="w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <span className="mr-1">✉️</span>
                      Invite Friends
                    </button>

                    {group.createdById !== user.uid && (
                      <button
                        onClick={() => leaveGroup(group.id, group.name)}
                        className="w-full bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        <span className="mr-1">🚪</span>
                        Leave Group
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Invite Modal */}
        {selectedGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Invite to "{selectedGroup.name}"
              </h3>
              <form onSubmit={inviteToGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="friend@example.com"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ⚠️ Important: They must have signed up with this exact email
                    address using Google authentication
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={inviting}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    {inviting ? "Sending..." : "Send Invite"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGroup(null);
                      setInviteEmail("");
                    }}
                    className="px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Group Modal */}
        {editingGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Edit Group
              </h3>
              <form onSubmit={updateGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    placeholder="e.g., Seattle Hiking Friends"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editGroupDescription}
                    onChange={(e) => setEditGroupDescription(e.target.value)}
                    placeholder="Optional group description"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={updating}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    {updating ? "Updating..." : "Update Group"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingGroup(null)}
                    className="px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
