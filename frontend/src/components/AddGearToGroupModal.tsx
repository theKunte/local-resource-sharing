import { useEffect, useState } from "react";
import axios from "axios";

interface Gear {
  id: string;
  title: string;
  description: string;
  image?: string;
}

interface SharedResourceRow {
  id: string;
}

interface Props {
  open: boolean;
  groupId: string;
  userId: string;
  onClose: () => void;
  onSaved?: () => void;
}

export default function AddGearToGroupModal({
  open,
  groupId,
  userId,
  onClose,
  onSaved,
}: Props) {
  const [myGear, setMyGear] = useState<Gear[]>([]);
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
        const [resMy, resShared] = await Promise.all([
          axios.get(
            `http://localhost:3001/api/resources?ownerId=${encodeURIComponent(
              userId
            )}`
          ),
          axios.get(
            `http://localhost:3001/api/groups/${encodeURIComponent(
              groupId
            )}/resources`
          ),
        ]);
        // Debug logs to help ensure the right data is returned
        console.debug("[AddGearToGroupModal] myGear count:", resMy.data.length);
        console.debug(
          "[AddGearToGroupModal] shared resources count:",
          resShared.data.length
        );
        setMyGear(resMy.data || []);
        const sharedData = (resShared.data || []) as SharedResourceRow[];
        const sharedList: string[] = sharedData.map((r) => r.id);
        setSharedIds(new Set(sharedList));
      } catch (err) {
        console.error("Failed to load gear or shared resources", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, groupId, userId]);

  const handleAdd = async (resourceId: string) => {
    setSavingId(resourceId);
    try {
      const res = await axios.post(
        `http://localhost:3001/api/resources/${encodeURIComponent(
          resourceId
        )}/groups/${encodeURIComponent(groupId)}`,
        { userId }
      );
      console.debug("[AddGearToGroupModal] add response status:", res.status);
      // update locally
      setSharedIds((s) => {
        const next = new Set(s);
        next.add(resourceId);
        return next;
      });
      if (onSaved) onSaved();
      try {
        window.dispatchEvent(
          new CustomEvent("resource:updated", {
            detail: { resource: { id: resourceId } },
          })
        );
      } catch (_err) {
        console.debug("[AddGearToGroupModal] dispatch failed", _err);
      }
    } catch (err) {
      console.error("Failed to add gear to group", err);
      alert("Failed to add gear to group. Please try again.");
    } finally {
      setSavingId(null);
    }
  };

  if (!open) return null;

  // show only gear not yet shared with this group
  const candidates = myGear.filter((g) => !sharedIds.has(g.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
        <h3 className="text-lg font-semibold mb-3">Add Gear to Group</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose from your existing gear to add it to this group.
        </p>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            No available gear to add.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-72 overflow-y-auto mb-4">
            {candidates.map((g) => (
              <div
                key={g.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleAdd(g.id);
                }}
                onClick={() => handleAdd(g.id)}
                className="p-3 bg-slate-50 rounded-lg flex items-start gap-3 cursor-pointer hover:shadow-md transition-shadow"
                aria-label={`Add ${g.title} to group`}
              >
                <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                  {g.image ? (
                    <img
                      src={g.image}
                      alt={g.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                      No Image
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{g.title}</div>
                  <div className="text-sm text-slate-600 line-clamp-2">
                    {g.description}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdd(g.id);
                    }}
                    disabled={savingId === g.id}
                    className="bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {savingId === g.id ? "Adding..." : "Add"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
