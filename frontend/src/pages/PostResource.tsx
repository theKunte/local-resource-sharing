import { useState, useEffect } from "react";
import apiClient from "../utils/apiClient";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { useNavigate } from "react-router-dom";
import { cropImageToSquare } from "../utils/cropImageToSquare";
import { uploadBlobToStorage } from "../utils/firebaseStorage";
import type { Group, CreateResourceRequest } from "../types/api.types";
import { getErrorMessage, logError } from "../utils/errorHandler";

const MAX_DESCRIPTION_LENGTH = 500;
const MAX_IMAGE_SIZE_MB = 10;

export default function PostResource() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const { user, loading } = useFirebaseAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const loadGroups = async () => {
      if (!user) return;

      try {
        setLoadingGroups(true);
        setGroupsError(null);
        const response = await apiClient.get(`/api/groups?userId=${user.uid}`);
        const userGroups = response.data.data ?? response.data;
        setGroups(userGroups);

        // By default, select all groups
        const allGroupIds = new Set<string>(
          userGroups.map((group: Group) => group.id),
        );
        setSelectedGroups(allGroupIds);
      } catch (error) {
        logError("PostResource - loadGroups", error);
        setGroupsError("Failed to load groups. Please refresh the page.");
      } finally {
        setLoadingGroups(false);
      }
    };

    loadGroups();
  }, [user]);

  // Cleanup image preview on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (file) {
      // Validate file size
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_IMAGE_SIZE_MB) {
        alert(
          `Image is too large (${sizeMB.toFixed(1)}MB). Please choose an image under ${MAX_IMAGE_SIZE_MB}MB.`,
        );
        return;
      }

      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImage(null);
      setImagePreview(null);
    }
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const value = e.target.value;
    if (value.length <= MAX_DESCRIPTION_LENGTH) {
      setDescription(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("You must be logged in to share gear.");
      return;
    }

    // Validate image is required
    if (!image) {
      alert(
        "Please upload an image of your item. Photos help build trust and make your item more likely to be borrowed.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const imageBlob = await cropImageToSquare(image, 200);
      const imageUrl = await uploadBlobToStorage(
        imageBlob,
        "resources",
        "resource.webp",
      );

      // Create the resource
      const resourceData: CreateResourceRequest = {
        title,
        description,
        image: imageUrl,
        ownerId: user.uid,
      };

      const resourceResponse = await apiClient.post(
        "/api/resources",
        resourceData,
      );

      const newResource = resourceResponse.data;

      // Share the resource with selected groups in parallel
      if (selectedGroups.size > 0) {
        try {
          const selectedGroupIds = Array.from(selectedGroups);
          await Promise.all(
            selectedGroupIds.map((groupId) =>
              apiClient.post(`/api/resources/${newResource.id}/share`, {
                groupId,
              }),
            ),
          );
        } catch (groupError) {
          logError("PostResource - share with groups", groupError);
          // Don't fail the whole operation if group sharing fails
        }
      }

      // Reset form
      setTitle("");
      setDescription("");
      setImage(null);
      setImagePreview(null);
      setSelectedGroups(new Set(groups.map((g) => g.id))); // Reset to all groups selected

      // Better success feedback
      const successMessage = `🎉 Your ${title} has been shared successfully!\n\n✅ Added to your gear collection\n👥 Shared with your trusted groups\n🔒 Only visible to people in your groups\n\nYour network can now discover and request this gear.`;
      alert(successMessage);

      // Navigate to profile to see the shared gear
      navigate("/profile");
    } catch (error) {
      logError("PostResource - handleSubmit", error);
      alert(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-slate-50 pb-20">
        {/* Hero Skeleton */}
        <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white py-8 sm:py-12 mb-6 sm:mb-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="mb-3 sm:mb-4">
              <div className="inline-block w-12 h-12 sm:w-16 sm:h-16 bg-cyan-400 rounded-full animate-pulse"></div>
            </div>
            <div className="h-9 sm:h-12 md:h-14 bg-cyan-400 rounded-lg mx-auto max-w-md mb-3 sm:mb-4 animate-pulse"></div>
            <div className="h-6 sm:h-8 bg-cyan-400 rounded-lg mx-auto max-w-lg animate-pulse opacity-70"></div>
          </div>
        </div>
        {/* Form Skeleton */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 p-4 sm:p-6">
              <div className="h-7 sm:h-8 bg-cyan-400 rounded-lg max-w-xs mb-2 animate-pulse"></div>
              <div className="h-4 sm:h-5 bg-cyan-400 rounded-lg max-w-md animate-pulse opacity-70"></div>
            </div>
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-5 sm:h-6 bg-gray-200 rounded-lg max-w-xs animate-pulse"></div>
                  <div className="h-12 sm:h-14 bg-gray-100 rounded-lg animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  if (!user) return null;
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-slate-50 pb-20">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white py-8 sm:py-12 mb-6 sm:mb-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
            Share Your Adventure Gear
          </h1>
          <p className="text-base sm:text-xl text-cyan-100 max-w-2xl mx-auto px-4">
            Help fellow adventurers discover amazing gear and build a community
            of trust
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Progress Indicator - Hidden on mobile */}
        <div className="mb-6 sm:mb-8 hidden sm:block">
          <div className="flex items-center justify-center space-x-4 text-sm font-medium">
            <div className="flex items-center text-cyan-600">
              <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                1
              </div>
              <span className="ml-2">Gear Details</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className="flex items-center text-gray-400">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white text-xs font-bold">
                2
              </div>
              <span className="ml-2">Share & Connect</span>
            </div>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 p-4 sm:p-6 text-white">
            <h2 className="text-xl sm:text-2xl font-bold flex items-center">
              Tell us about your gear
            </h2>
            <p className="text-cyan-100 mt-1 sm:mt-2 text-sm sm:text-base">
              The more details you share, the more likely someone will want to
              borrow it!
            </p>
          </div>

          {/* Form Content */}
          <form
            onSubmit={handleSubmit}
            className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 min-h-[50vh]"
          >
            {/* Gear Name Section */}
            <div className="group">
              <label
                htmlFor="gear-title"
                className="block mb-2 sm:mb-3 text-base sm:text-lg font-semibold text-gray-800 flex items-center"
              >
                What gear are you sharing?
              </label>
              <input
                id="gear-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g., REI Half Dome Tent"
                className="w-full px-4 sm:px-6 py-3 sm:py-4 border-2 border-gray-200 rounded-lg sm:rounded-xl text-gray-800 placeholder-gray-500 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 focus:outline-none transition-all duration-200 text-base sm:text-lg group-hover:border-gray-300"
              />
              <p className="text-xs sm:text-sm text-gray-600 mt-2 flex items-center">
                Include brand and model
              </p>
            </div>

            {/* Description Section */}
            <div className="group">
              <label
                htmlFor="gear-description"
                className="block mb-2 sm:mb-3 text-base sm:text-lg font-semibold text-gray-800 flex items-center"
              >
                Describe your gear:
              </label>
              <textarea
                id="gear-description"
                value={description}
                onChange={handleDescriptionChange}
                required
                rows={5}
                maxLength={MAX_DESCRIPTION_LENGTH}
                placeholder="Share details about condition, capacity, and special features..."
                className="w-full px-4 sm:px-6 py-3 sm:py-4 border-2 border-gray-200 rounded-lg sm:rounded-xl text-gray-800 placeholder-gray-500 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 focus:outline-none transition-all duration-200 text-base sm:text-lg resize-none group-hover:border-gray-300"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs sm:text-sm text-gray-600 flex items-center">
                  <span className="hidden sm:inline">
                    Detailed descriptions get 3x more requests
                  </span>
                  <span className="sm:hidden">Details increase requests</span>
                </p>
                <span
                  className={`text-xs sm:text-sm ${description.length >= MAX_DESCRIPTION_LENGTH ? "text-red-500 font-semibold" : "text-gray-500"}`}
                >
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
            </div>

            {/* Photo Section */}
            <div className="group">
              <label
                htmlFor="image-upload-section"
                className="block mb-2 sm:mb-3 text-base sm:text-lg font-semibold text-gray-800 flex items-center flex-wrap"
              >
                Add a photo
                <span className="ml-2 text-xs sm:text-sm font-normal text-red-600 bg-red-50 px-2 py-1 rounded-full">
                  Required
                </span>
              </label>

              {!imagePreview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg sm:rounded-xl p-6 sm:p-8 text-center hover:border-cyan-400 transition-colors duration-200 group-hover:border-gray-400">
                  <div className="mb-3 sm:mb-4"></div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                    aria-labelledby="image-upload-section"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer inline-block bg-cyan-400 hover:bg-cyan-500 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-colors duration-200 text-sm sm:text-base"
                  >
                    Choose Photo
                  </label>
                  <p className="text-gray-600 mt-2 text-xs sm:text-sm">
                    <span className="hidden sm:inline">
                      Clear photos get 5x more interest! (Max{" "}
                      {MAX_IMAGE_SIZE_MB}MB)
                    </span>
                    <span className="sm:hidden">
                      Photos increase interest! (Max {MAX_IMAGE_SIZE_MB}MB)
                    </span>
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Gear preview"
                    className="w-full h-64 sm:h-80 object-cover rounded-lg sm:rounded-xl border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-red-500 hover:bg-red-600 text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors duration-200 flex items-center justify-center"
                    aria-label="Remove photo"
                  >
                    <span className="text-sm sm:text-base">✕</span>
                  </button>
                  <div className="mt-3 text-center">
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer text-cyan-600 hover:text-cyan-700 font-medium text-sm sm:text-base"
                    >
                      Change photo
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                      aria-labelledby="image-upload-section"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Group Selection Section */}
            <div className="group">
              <label
                htmlFor="group-selection-section"
                className="block mb-2 sm:mb-3 text-base sm:text-lg font-semibold text-gray-800 flex items-center flex-wrap gap-2"
              >
                Share with groups
                {loadingGroups && (
                  <span className="text-xs sm:text-sm font-normal text-gray-500">
                    Loading...
                  </span>
                )}
              </label>

              {groupsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                  <p className="text-red-800 text-xs sm:text-sm">
                    <span className="mr-1">⚠️</span>
                    {groupsError}
                  </p>
                </div>
              )}

              {loadingGroups ? (
                <div className="space-y-3">
                  <div className="h-5 bg-gray-200 rounded max-w-xs animate-pulse"></div>
                  <div className="grid gap-2 sm:gap-3 min-h-[12rem]">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center space-x-3 p-2.5 sm:p-3 bg-gray-50 rounded-lg animate-pulse"
                      >
                        <div className="w-4 h-4 bg-gray-300 rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-300 rounded max-w-[60%]"></div>
                          <div className="h-3 bg-gray-200 rounded max-w-[40%]"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : groups.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                  <p className="text-yellow-800 text-xs sm:text-sm">
                    You're not in any groups yet. Your gear will be private
                    until you join or create a group.
                  </p>
                </div>
              ) : (
                <div
                  className="space-y-3 min-h-[12rem]"
                  id="group-selection-section"
                >
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <p className="text-xs sm:text-sm text-gray-600">
                      Select which groups can see this gear
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedGroups(new Set(groups.map((g) => g.id)))
                        }
                        className="text-xs text-cyan-600 hover:text-cyan-700 underline"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedGroups(new Set())}
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                      >
                        Select None
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:gap-3 max-h-48 sm:max-h-56 overflow-y-auto">
                    {groups.map((group) => (
                      <label
                        key={group.id}
                        className="flex items-center space-x-3 p-2.5 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroups.has(group.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedGroups);
                            if (e.target.checked) {
                              newSelected.add(group.id);
                            } else {
                              newSelected.delete(group.id);
                            }
                            setSelectedGroups(newSelected);
                          }}
                          className="w-4 h-4 text-cyan-600 focus:ring-cyan-400 border-gray-300 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-gray-900 text-sm sm:text-base truncate">
                              {group.name}
                            </span>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {group.memberCount} member
                              {group.memberCount !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <span className="text-xs text-cyan-600 capitalize">
                            Your role: {group.userRole}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>

                  {selectedGroups.size === 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 sm:p-3">
                      <p className="text-orange-800 text-xs sm:text-sm">
                        <span className="mr-1">⚠️</span>
                        No groups selected. Your gear will be private and not
                        visible to anyone.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Section */}
            <div className="bg-cyan-50 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-cyan-200">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800 text-base sm:text-lg">
                    Ready to share?
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm">
                    <span className="hidden sm:inline">
                      Your gear will be visible to your trusted network
                    </span>
                    <span className="sm:hidden">Visible to your network</span>
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-cyan-400 hover:bg-cyan-500 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-lg sm:rounded-xl shadow-lg transition-all duration-200 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-base sm:text-lg"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sharing your gear...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    Share My Gear
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Trust & Safety Note */}
        <div className="mt-6 sm:mt-8 bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-4 sm:p-6">
          <div className="flex items-start">
            <span className="text-xl sm:text-2xl mr-2 sm:mr-3">🛡️</span>
            <div>
              <h3 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">
                Trust & Safety
              </h3>
              <p className="text-blue-700 text-xs sm:text-sm leading-relaxed">
                Your gear is only visible to people in your trusted groups. We
                recommend starting with close friends and expanding your network
                gradually as you build confidence in the community.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
