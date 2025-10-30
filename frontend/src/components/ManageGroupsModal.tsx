import { useEffect, useState } from "react";
import axios from "axios";

interface Group {
  id: string;
  name: string;
  avatar?: string;
  memberCount?: number;
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
          axios.get(`/api/users/${encodeURIComponent(userId)}/groups`),
          axios.get(`/api/resources/${encodeURIComponent(resourceId)}/groups`, {
            params: { userId },
          }),
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
      const sharedResp = await axios.get(
        `/api/resources/${encodeURIComponent(resourceId)}/groups`,
        { params: { userId } }
      );
      const currentlyShared: string[] = sharedResp.data.map((g: any) => g.id);
      const toAdd = Array.from(current).filter(
        (id) => !currentlyShared.includes(id)
      );
      const toRemove = currentlyShared.filter((id) => !current.has(id));

      for (const gid of toAdd) {
        await axios.post(
          `/api/resources/${encodeURIComponent(
            resourceId
          )}/groups/${encodeURIComponent(gid)}`,
          { userId }
        );
      }
      for (const gid of toRemove) {
        await axios.delete(
          `/api/resources/${encodeURIComponent(
            resourceId
          )}/groups/${encodeURIComponent(gid)}`,
          { data: { userId } }
        );
      }

      // Notify others
      try {
        window.dispatchEvent(
          new CustomEvent("resource:updated", {
            detail: { resource: { id: resourceId } },
          })
        );
      } catch (e) {}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold mb-3">Manage Groups</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose which groups this item should be shared with.
        </p>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
            {groups.map((g) => (
              <label
                key={g.id}
                className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(g.id)}
                  onChange={() => toggle(g.id)}
                  className="w-4 h-4 text-emerald-600"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-xs text-gray-500">
                      {g.memberCount ?? "-"} members
                    </span>
                  </div>
                </div>
              </label>
            ))}
            {groups.length === 0 && (
              <div className="text-sm text-gray-500">
                You are not a member of any groups.
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
