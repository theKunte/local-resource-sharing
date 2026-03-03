import { useState, useEffect } from "react";
import axios from "axios";
import apiClient from "../utils/apiClient";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Users, Plus, Eye, UserPlus, DoorOpen, Edit, X } from "lucide-react";

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
        const response = await apiClient.get(`/api/groups?userId=${user!.uid}`);

        // Get detailed info for each group including members
        const groupsWithDetails = await Promise.all(
          response.data.map(async (group: Group) => {
            try {
              const membersResponse = await apiClient.get(
                `/api/groups/${group.id}/members`,
              );
              return {
                ...group,
                members: membersResponse.data,
                memberCount: membersResponse.data.length,
              };
            } catch (error) {
              console.error(
                `Error loading members for group ${group.id}:`,
                error,
              );
              return { ...group, members: [], memberCount: 0 };
            }
          }),
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
      const response = await apiClient.get(`/api/groups?userId=${user!.uid}`);

      // Get detailed info for each group including members
      const groupsWithDetails = await Promise.all(
        response.data.map(async (group: Group) => {
          try {
            const membersResponse = await apiClient.get(
              `/api/groups/${group.id}/members`,
            );
            return {
              ...group,
              members: membersResponse.data,
              memberCount: membersResponse.data.length,
            };
          } catch (error) {
            console.error(
              `Error loading members for group ${group.id}:`,
              error,
            );
            return { ...group, members: [], memberCount: 0 };
          }
        }),
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
      await apiClient.post("/api/groups", {
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
      const response = await apiClient.post(
        `/api/groups/${selectedGroup.id}/invite`,
        {
          email: inviteEmail.trim().toLowerCase(), // Normalize email
          invitedBy: user!.uid,
        },
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
      await apiClient.delete(`/api/groups/${groupId}/members/${user!.uid}`);
      await loadGroups();
      alert(`You've left "${groupName}"`);
    } catch (error) {
      console.error("Error leaving group:", error);
      alert("Failed to leave group. Please try again.");
    }
  };

  const updateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;

    try {
      setUpdating(true);
      await apiClient.put(`/api/groups/${editingGroup.id}`, {
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sage-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-sage-200 border-t-sage-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your groups...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 via-white to-slate-50">
      {/* DEBUG */}
      {selectedGroup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            background: "red",
            color: "white",
            padding: "10px",
            zIndex: 99999999,
            fontSize: "20px",
            fontWeight: "bold",
          }}
        >
          MODAL SHOULD BE VISIBLE - Group: {selectedGroup.name}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-sage-100 py-12 mb-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="mb-6 flex justify-center">
            <div className="bg-sage-100 p-6 rounded-full">
              <Users className="w-12 h-12 text-sage-700" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
            Your Groups
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Manage your trusted circles and share gear safely with friends
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-28">
        {/* Create Group Button */}
        <div className="mb-8 text-center">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-sage-600 hover:bg-sage-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-sm inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create New Group
          </button>
        </div>

        {/* Create Group Form */}
        <AnimatePresence mode="wait">
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl shadow-sm border border-sage-100 p-6 mb-8"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Create a New Group
              </h3>
              <form onSubmit={createGroup} className="flex gap-4">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Seattle Hiking Friends, College Roommates"
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-sage-500 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-sage-600 hover:bg-sage-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Groups Grid */}
        {groups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="text-center py-16 px-6 bg-white rounded-3xl border-2 border-dashed border-sage-200"
          >
            <div className="mb-4 flex justify-center">
              <div className="bg-sage-100 p-6 rounded-full">
                <Users className="w-12 h-12 text-sage-600" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              No groups yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first group to start sharing gear with trusted
              friends!
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {groups.map((group) => {
                // Determine user's role in this group
                const isOwner = group.createdById === user?.uid;
                const userRole = isOwner ? "OWNER" : "MEMBER";

                return (
                  <motion.div
                    key={group.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="p-6">
                      {/* Group Header with Role Badge */}
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900 flex-1 pr-3">
                          {group.name}
                        </h3>
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                          {userRole}
                        </span>
                      </div>

                      {/* Member Count */}
                      <div className="flex items-center gap-2 text-gray-500 mb-4">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">
                          {group.memberCount} member
                          {group.memberCount !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Members List */}
                      <div className="mb-5">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                          Members:
                        </h4>
                        <div className="space-y-2">
                          {group.members?.slice(0, 3).map((member) => (
                            <div
                              key={member.id}
                              className="text-sm text-gray-700 flex items-center"
                            >
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2.5"></span>
                              <span className="truncate">
                                {member.user.name || member.user.email}
                                {member.user.id === user.uid && " (You)"}
                              </span>
                            </div>
                          ))}
                          {group.memberCount! > 3 && (
                            <div className="text-sm text-gray-500 ml-4">
                              +{group.memberCount! - 3} more...
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-2.5">
                        <button
                          onClick={() => navigate(`/groups/${group.id}`)}
                          className="w-full bg-cyan-100 hover:bg-cyan-200 text-cyan-700 px-4 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Group
                        </button>

                        <button
                          onClick={() => {
                            console.log("Invite Friends clicked:", group);
                            setSelectedGroup(group);
                          }}
                          className="w-full bg-cyan-100 hover:bg-cyan-200 text-cyan-700 px-4 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          <UserPlus className="w-4 h-4" />
                          Invite Friends
                        </button>

                        {group.createdById !== user.uid && (
                          <button
                            onClick={() => leaveGroup(group.id, group.name)}
                            className="w-full bg-pink-100 hover:bg-pink-200 text-pink-700 px-4 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <DoorOpen className="w-4 h-4" />
                            Leave Group
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {selectedGroup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
          }}
          onClick={() => {
            console.log("Backdrop clicked");
            setSelectedGroup(null);
            setInviteEmail("");
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "40px",
              padding: "32px",
              maxWidth: "400px",
              width: "100%",
              position: "relative",
              border: "3px solid #06b6d4",
            }}
            onClick={(e) => {
              console.log("Modal clicked");
              e.stopPropagation();
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  backgroundColor: "#ecfeff",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0891b2",
                  marginBottom: "24px",
                }}
              >
                <UserPlus size={32} />
              </div>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#0f172a",
                  marginBottom: "8px",
                }}
              >
                Invite to Group
              </h2>
              <p
                style={{
                  color: "#64748b",
                  fontSize: "14px",
                  marginBottom: "32px",
                }}
              >
                Invite your friends to{" "}
                <span style={{ fontWeight: "bold", color: "#0f172a" }}>
                  {selectedGroup.name}
                </span>{" "}
                to start sharing gear.
              </p>

              <form onSubmit={inviteToGroup} style={{ width: "100%" }}>
                <div style={{ position: "relative", marginBottom: "16px" }}>
                  <Users
                    style={{
                      position: "absolute",
                      left: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                    }}
                    size={18}
                  />
                  <input
                    id="invite-email"
                    name="inviteEmail"
                    type="email"
                    placeholder="Friend's email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    style={{
                      width: "100%",
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "16px",
                      padding: "16px 16px 16px 48px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                    required
                  />
                </div>

                {selectedGroup.members && selectedGroup.members.length > 1 && (
                  <div style={{ textAlign: "left", marginBottom: "16px" }}>
                    <h4
                      style={{
                        fontSize: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontWeight: "bold",
                        color: "#94a3b8",
                        marginBottom: "12px",
                        paddingLeft: "4px",
                      }}
                    >
                      Suggested:
                    </h4>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                    >
                      {selectedGroup.members
                        .filter((m) => m.user.id !== user?.uid)
                        .slice(0, 3)
                        .map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => setInviteEmail(member.user.email)}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#475569",
                              cursor: "pointer",
                            }}
                          >
                            {member.user.name ||
                              member.user.email.split("@")[0]}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                <div style={{ paddingTop: "16px" }}>
                  <button
                    type="submit"
                    disabled={inviting}
                    style={{
                      width: "100%",
                      backgroundColor: "#22d3ee",
                      color: "white",
                      padding: "16px",
                      borderRadius: "16px",
                      fontWeight: "600",
                      border: "none",
                      cursor: inviting ? "not-allowed" : "pointer",
                      opacity: inviting ? 0.5 : 1,
                      marginBottom: "12px",
                    }}
                  >
                    {inviting ? "Sending Invitation..." : "Send Invitation"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGroup(null);
                      setInviteEmail("");
                    }}
                    style={{
                      width: "100%",
                      color: "#64748b",
                      padding: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ zIndex: 9999 }}
          onClick={() => setEditingGroup(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Edit Group</h3>
              <button
                onClick={() => setEditingGroup(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={updateGroup} className="space-y-5">
              <div>
                <label
                  htmlFor="group-name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Group Name
                </label>
                <input
                  id="group-name"
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  placeholder="e.g., Seattle Hiking Friends"
                  autoFocus
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-sage-500 focus:ring-2 focus:ring-sage-200 focus:outline-none transition-colors bg-white text-gray-900"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="group-description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="group-description"
                  value={editGroupDescription}
                  onChange={(e) => setEditGroupDescription(e.target.value)}
                  placeholder="Optional group description"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-sage-500 focus:ring-2 focus:ring-sage-200 focus:outline-none transition-colors bg-white text-gray-900"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 bg-sage-600 hover:bg-sage-700 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {updating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4" />
                      Update Group
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
