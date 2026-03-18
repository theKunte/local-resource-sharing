import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Edit2, Share2, Trash2, Users, Clock } from "lucide-react";
import type { Resource, CurrentLoan } from "../types/api.types";

// Re-export Resource as Gear for backward compatibility
export type Gear = Resource;

interface EditGearModalProps {
  resource: Resource | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    resource: Resource,
    updates: { title: string; description?: string },
  ) => void;
}

const EditGearModal: React.FC<EditGearModalProps> = ({
  resource,
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(resource?.title || "");
  const [description, setDescription] = useState(resource?.description || "");
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (resource) {
      setTitle(resource.title);
      setDescription(resource.description || "");
    }
  }, [resource]);

  if (!resource) return null;

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      onSave(resource, { title, description });
      setIsSaving(false);
      onClose();
    }, 800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Edit Gear
            </h2>
            <div className="space-y-6 mb-8">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 px-1">
                  Item Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 px-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all resize-none"
                />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving || !title}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Clock className="animate-spin" size={18} />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
              <button
                onClick={onClose}
                className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface GearCardProps extends Omit<
  Resource,
  "ownerId" | "status" | "currentLoan"
> {
  ownerId?: string;
  isAvailable?: boolean;
  status?: "AVAILABLE" | "BORROWED" | "UNAVAILABLE";
  currentLoan?:
    | CurrentLoan
    | {
        id: string;
        status: string;
        startDate: string;
        endDate: string;
        returnedDate?: string;
        borrower: {
          id: string;
          name?: string;
          email: string;
        };
      };
  onDelete?: (id: string) => void;
  onEdit?: (gear: Resource) => void;
  onManageGroups?: (gear: Resource) => void;
  onRequestBorrow?: (gearId: string) => void;
  showActions?: boolean;
  sharedWith?: Array<{
    id: string;
    resourceId: string;
    groupId: string;
    group: {
      id: string;
      name: string;
      avatar?: string;
    };
  }>;
}

const GearCard: React.FC<GearCardProps> = ({
  id,
  title,
  description,
  image,
  ownerId = "",
  isAvailable = true,
  status = "AVAILABLE",
  currentLoan,
  onDelete,
  onEdit,
  onRequestBorrow,
  showActions = false,
  onManageGroups,
  sharedWith = [],
}) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const isBorrowed = status === "BORROWED" && currentLoan;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleEditClick = () => {
    setIsEditOpen(true);
  };

  const handleSaveEdit = (
    resource: Resource,
    updates: { title: string; description?: string },
  ) => {
    console.log("Saving updates:", updates);
    if (onEdit) {
      onEdit({
        ...resource,
        title: updates.title,
        description: updates.description || resource.description,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`bg-white border rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col ${
        isBorrowed ? "border-amber-200 bg-amber-50/30" : "border-slate-100"
      }`}
    >
      {/* Image Section */}
      {image && (
        <div className="relative w-full aspect-video overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
          <motion.img
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
            src={image}
            alt={title}
            className={`w-full h-full object-cover ${
              isBorrowed ? "opacity-50 grayscale" : ""
            }`}
          />
          {isBorrowed && (
            <div className="absolute inset-0 bg-slate-900 opacity-20 pointer-events-none"></div>
          )}
          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-4 left-4"
          >
            <div
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border backdrop-blur-md ${
                isBorrowed
                  ? "bg-amber-500/90 text-white border-amber-600"
                  : isAvailable
                    ? "bg-emerald-500/90 text-white border-emerald-600"
                    : "bg-slate-800/80 text-white border-slate-700"
              }`}
            >
              {isBorrowed
                ? "Currently Borrowed"
                : isAvailable
                  ? "Available"
                  : "Unavailable"}
            </div>
          </motion.div>
        </div>
      )}

      {/* Content Section */}
      <div className="px-6 pt-5 pb-5 flex-1 flex flex-col">
        {/* Title */}
        <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2">
          {title}
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-500 mb-4 line-clamp-2 leading-relaxed font-medium">
          {description}
        </p>

        {/* Shared Groups Info */}
        {showActions && sharedWith && sharedWith.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-6"
          >
            <div className="flex -space-x-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-400"
                >
                  <Users size={10} />
                </div>
              ))}
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Shared in {sharedWith.length}{" "}
              {sharedWith.length === 1 ? "Group" : "Groups"}
            </span>
          </motion.div>
        )}

        {/* Borrower Info */}
        {isBorrowed && currentLoan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4"
          >
            <div className="mb-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">
                  Borrowed by:
                </p>
                <p className="text-sm font-bold text-amber-900 truncate">
                  {currentLoan.borrower.name || currentLoan.borrower.email}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-amber-600 font-bold uppercase tracking-widest">
                <span>Return by {formatDate(currentLoan.endDate)}</span>
              </div>
            </div>
            <span className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white uppercase tracking-wider">
              Currently Borrowed
            </span>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-auto">
          {!showActions && onRequestBorrow && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (isBorrowed) return;
                try {
                  onRequestBorrow(id);
                } catch (error) {
                  console.error(
                    "[GearCard] Error calling onRequestBorrow:",
                    error,
                  );
                }
              }}
              disabled={!!isBorrowed}
              className={`flex-1 text-xs font-bold py-3 px-4 rounded-2xl transition-all duration-200 uppercase tracking-wider ${
                isBorrowed
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-cyan-400 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-400/20"
              }`}
            >
              {isBorrowed ? "Currently Borrowed" : "Request to Borrow"}
            </motion.button>
          )}

          {showActions && (
            <div className="grid grid-cols-3 gap-2">
              {onEdit && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleEditClick}
                  className="flex flex-col items-center justify-center py-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-colors group"
                  title="Edit gear"
                >
                  <Edit2
                    size={16}
                    className="mb-1 group-hover:scale-110 transition-transform"
                  />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">
                    Edit
                  </span>
                </motion.button>
              )}
              {onManageGroups && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    onManageGroups({
                      id,
                      title,
                      description,
                      image,
                      ownerId,
                      status,
                      currentLoan,
                      sharedWith,
                    } as Resource)
                  }
                  className="flex flex-col items-center justify-center py-3 bg-cyan-50 text-cyan-600 rounded-2xl hover:bg-cyan-100 transition-colors group"
                  title="Share to groups"
                >
                  <Share2
                    size={16}
                    className="mb-1 group-hover:scale-110 transition-transform"
                  />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">
                    Share
                  </span>
                </motion.button>
              )}
              {onDelete && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onDelete(id)}
                  className="flex flex-col items-center justify-center py-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-colors group"
                  title="Delete gear"
                >
                  <Trash2
                    size={16}
                    className="mb-1 group-hover:scale-110 transition-transform"
                  />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">
                    Delete
                  </span>
                </motion.button>
              )}
            </div>
          )}
        </div>
      </div>

      <EditGearModal
        resource={
          {
            id,
            title,
            description,
            image,
            ownerId,
            status,
            currentLoan,
            sharedWith,
          } as Resource
        }
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={handleSaveEdit}
      />
    </motion.div>
  );
};

export default GearCard;
