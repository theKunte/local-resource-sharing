import { useEffect, useState } from "react";
import apiClient from "../utils/apiClient";
import { motion, AnimatePresence } from "motion/react";
import { Users, X, Check } from "lucide-react";

interface Group {
  id: string;
  name: string;
  avatar?: string;
  memberCount?: number;
}

interface SimpleGroupId {
  id: string;
}

interface Props {
  open: boolean;
  userId: string;
  resourceId: string;
  onClose: () => void;
  onSaved?: () => void;
}

export default function ManageGroupsModal({
  open,
  userId,
  resourceId,
  onClose,
  onSaved,
}: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const [allRes, sharedRes] = await Promise.all([
          apiClient.get(`/api/users/${encodeURIComponent(userId)}/groups`),
          apiClient.get(
            `/api/resources/${encodeURIComponent(resourceId)}/groups`,
            {
              params: { userId },
            },
          ),
        ]);
        const allGroups: Group[] = allRes.data;
        const sharedGroups: Group[] = sharedRes.data;
        setGroups(allGroups);
        const sel = new Set<string>(sharedGroups.map((g) => g.id));
        setSelected(sel);
      } catch (err) {
        console.error("Failed to load groups for manage modal", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, userId, resourceId]);

  const toggle = (id: string) => {
    const copy = new Set(selected);
    if (copy.has(id)) copy.delete(id);
    else copy.add(id);
    setSelected(copy);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const current = new Set<string>(selected);
      // fetch current shared (again) to compute diff reliably
      const sharedResp = await apiClient.get(
        `/api/resources/${encodeURIComponent(resourceId)}/groups`,
        { params: { userId } },
      );
      const sharedData = sharedResp.data as SimpleGroupId[];
      const currentlyShared: string[] = sharedData.map((g) => g.id);
      const toAdd = Array.from(current).filter(
        (id) => !currentlyShared.includes(id),
      );
      const toRemove = currentlyShared.filter((id) => !current.has(id));

      for (const gid of toAdd) {
        await apiClient.post(
          `/api/resources/${encodeURIComponent(
            resourceId,
          )}/groups/${encodeURIComponent(gid)}`,
          { userId },
        );
      }
      for (const gid of toRemove) {
        await apiClient.delete(
          `/api/resources/${encodeURIComponent(
            resourceId,
          )}/groups/${encodeURIComponent(gid)}`,
          { data: { userId } },
        );
      }

      // Notify others
      try {
        window.dispatchEvent(
          new CustomEvent("resource:updated", {
            detail: { resource: { id: resourceId } },
          }),
        );
      } catch (_err) {
        console.debug("[ManageGroupsModal] dispatch failed", _err);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error("Failed to save group membership for resource", err);
      alert("Failed to update groups. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 bg-white rounded-3xl shadow-xl w-full max-w-lg p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-sage-100 p-2.5 rounded-xl">
                  <Users className="w-5 h-5 text-sage-700" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Manage Groups
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Choose which groups this item should be shared with.
            </p>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-sage-200 border-t-sage-600 mb-3"></div>
                <p className="text-gray-600 font-medium">Loading groups...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto mb-6 pr-2">
                <AnimatePresence mode="popLayout">
                  {groups.map((g) => (
                    <motion.label
                      key={g.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.15 }}
                      className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-200 ${
                        selected.has(g.id)
                          ? "bg-sage-50 border-2 border-sage-300 shadow-sm"
                          : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                      }`}
                    >
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={selected.has(g.id)}
                          onChange={() => toggle(g.id)}
                          className="sr-only"
                        />
                        <div
                          className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                            selected.has(g.id)
                              ? "bg-sage-600 border-sage-600"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          {selected.has(g.id) && (
                            <Check
                              className="w-3.5 h-3.5 text-white"
                              strokeWidth={3}
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-semibold truncate ${
                              selected.has(g.id)
                                ? "text-sage-900"
                                : "text-gray-900"
                            }`}
                          >
                            {g.name}
                          </span>
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${
                              selected.has(g.id)
                                ? "bg-sage-100 text-sage-700"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {g.memberCount ?? 0} members
                          </span>
                        </div>
                      </div>
                    </motion.label>
                  ))}
                </AnimatePresence>
                {groups.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200"
                  >
                    <div className="mb-3 flex justify-center">
                      <div className="bg-gray-100 p-4 rounded-full">
                        <Users className="w-8 h-8 text-gray-400" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                      You are not a member of any groups yet.
                    </p>
                  </motion.div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-sage-600 text-white hover:bg-sage-700 disabled:opacity-60 font-semibold transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
