import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

interface Group {
  id: string;
  name: string;
  avatar?: string;
  memberCount: number;
}

interface ManageGroupSharingProps {
  isOpen: boolean;
  onClose: () => void;
  gearId: string;
  gearTitle: string;
  userId: string;
}

const ManageGroupSharing: React.FC<ManageGroupSharingProps> = ({
  isOpen,
  onClose,
  gearId,
  gearTitle,
  userId,
}) => {
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [sharedGroups, setSharedGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load all user's groups
      const userGroupsResponse = await axios.get(
        `http://localhost:3001/api/users/${userId}/groups`
      );
      setAllGroups(userGroupsResponse.data);

      // Load groups this gear is already shared with
      const sharedGroupsResponse = await axios.get(
        `http://localhost:3001/api/resources/${gearId}/groups?userId=${userId}`
      );
      setSharedGroups(sharedGroupsResponse.data);
    } catch (error) {
      console.error("Error loading group data:", error);
    } finally {
      setLoading(false);
    }
  }, [gearId, userId]);

  useEffect(() => {
    if (isOpen && gearId && userId) {
      loadData();
    }
  }, [isOpen, gearId, userId, loadData]);

  const addToGroup = async (groupId: string) => {
    setSubmitting(true);
    try {
      await axios.post(
        `http://localhost:3001/api/resources/${gearId}/groups/${groupId}`,
        {
          userId,
        }
      );

      // Refresh data after successful addition
      await loadData();
    } catch (error) {
      console.error("Error adding gear to group:", error);
      alert("Failed to add gear to group. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const removeFromGroup = async (groupId: string) => {
    setSubmitting(true);
    try {
      await axios.delete(
        `http://localhost:3001/api/resources/${gearId}/groups/${groupId}`,
        {
          data: { userId },
        }
      );

      // Refresh data after successful removal
      await loadData();
    } catch (error) {
      console.error("Error removing gear from group:", error);
      alert("Failed to remove gear from group. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isSharedWithGroup = (groupId: string) => {
    return sharedGroups.some((group) => group.id === groupId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Manage Group Sharing</h2>
              <p className="text-emerald-100 text-sm mt-1">{gearTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-emerald-200 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading groups...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Select which groups to share this gear with:
              </div>

              {allGroups.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <span className="text-2xl block mb-2">👥</span>
                  <p>You don't belong to any groups yet.</p>
                  <p className="text-sm mt-1">
                    Create a group to start sharing!
                  </p>
                </div>
              ) : (
                allGroups.map((group) => {
                  const isShared = isSharedWithGroup(group.id);

                  return (
                    <div
                      key={group.id}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                        isShared
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                          {group.avatar ? (
                            <img
                              src={group.avatar}
                              alt={group.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            group.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {group.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {group.memberCount} member
                            {group.memberCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isShared ? (
                          <>
                            <span className="text-emerald-600 text-sm font-medium">
                              Shared
                            </span>
                            <button
                              onClick={() => removeFromGroup(group.id)}
                              disabled={submitting}
                              className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => addToGroup(group.id)}
                            disabled={submitting}
                            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-600 px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Currently shared with {sharedGroups.length} group
            {sharedGroups.length !== 1 ? "s" : ""}
          </div>
          <button
            onClick={onClose}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageGroupSharing;
