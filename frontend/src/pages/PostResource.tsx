import { useState, useEffect } from "react";
import axios from "axios";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { useNavigate } from "react-router-dom";

interface Group {
  id: string;
  name: string;
  memberCount: number;
  userRole: string;
}

export default function PostResource() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [loadingGroups, setLoadingGroups] = useState(false);
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
        const response = await axios.get(`http://localhost:3001/api/groups?userId=${user.uid}`);
        const userGroups = response.data;
        setGroups(userGroups);
        
        // By default, select all groups
        const allGroupIds = new Set<string>();
        userGroups.forEach((group: Group) => {
          allGroupIds.add(group.id);
        });
        setSelectedGroups(allGroupIds);
      } catch (error) {
        console.error("Error loading groups:", error);
      } finally {
        setLoadingGroups(false);
      }
    };

    loadGroups();
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("You must be logged in to share gear.");
      return;
    }
    setSubmitting(true);

    try {
      let imageData: string | undefined = undefined;
      if (image) {
        imageData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(image);
        });      }

      // Create the resource
      const resourceResponse = await axios.post("http://localhost:3001/api/resources", {
        title,
        description,
        image: imageData,
        ownerId: user.uid,
        email: user.email,
        name: user.displayName,
      });

      const newResource = resourceResponse.data;

      // Share the resource with selected groups
      try {
        const selectedGroupIds = Array.from(selectedGroups);
        
        for (const groupId of selectedGroupIds) {
          await axios.post(`http://localhost:3001/api/resources/${newResource.id}/share`, {
            groupId,
          });
        }
        
        console.log(`Resource shared with ${selectedGroupIds.length} group(s)`);
      } catch (groupError) {
        console.warn("Could not share with groups:", groupError);
        // Don't fail the whole operation if group sharing fails
      }      setTitle("");
      setDescription("");
      setImage(null);
      setImagePreview(null);
      
      // Better success feedback
      const successMessage = `🎉 Your ${title} has been shared successfully!\n\n✅ Added to your gear collection\n👥 Shared with your trusted groups\n🔒 Only visible to people in your groups\n\nYour network can now discover and request this gear.`;
      alert(successMessage);
      
      // Navigate to profile to see the shared gear
      navigate("/profile");
    } catch (error) {
      console.error("Error sharing gear:", error);
      alert("Oops! Something went wrong while sharing your gear. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return null;
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white py-12 mb-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="mb-4">
            <span className="text-5xl">🏔️</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Share Your Adventure Gear
          </h1>
          <p className="text-xl text-emerald-100 max-w-2xl mx-auto">
            Help fellow adventurers discover amazing gear and build a community of trust
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-12">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4 text-sm font-medium">
            <div className="flex items-center text-emerald-600">
              <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
              <span className="ml-2">Gear Details</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className="flex items-center text-gray-400">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
              <span className="ml-2">Share & Connect</span>
            </div>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
            <h2 className="text-2xl font-bold flex items-center">
              <span className="mr-3">📦</span>
              Tell us about your gear
            </h2>
            <p className="text-emerald-100 mt-2">
              The more details you share, the more likely someone will want to borrow it!
            </p>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Gear Name Section */}
            <div className="group">
              <label className="block mb-3 text-lg font-semibold text-gray-800 flex items-center">
                <span className="mr-2">🎯</span>
                What gear are you sharing?
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g., REI Co-op Half Dome 2 Plus Tent, Osprey Atmos 65L Backpack"
                className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 focus:outline-none transition-all duration-200 text-lg group-hover:border-gray-300"
              />
              <p className="text-sm text-gray-600 mt-2 flex items-center">
                <span className="mr-1">💡</span>
                Include brand and model for better visibility
              </p>
            </div>

            {/* Description Section */}
            <div className="group">
              <label className="block mb-3 text-lg font-semibold text-gray-800 flex items-center">
                <span className="mr-2">📝</span>
                Describe your gear
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={6}
                placeholder="Share details about condition, capacity, special features, what adventures it's been on, and any tips for using it..."
                className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 focus:outline-none transition-all duration-200 text-lg resize-none group-hover:border-gray-300"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-gray-600 flex items-center">
                  <span className="mr-1">⭐</span>
                  Detailed descriptions get 3x more requests
                </p>
                <span className="text-sm text-gray-500">{description.length}/500</span>
              </div>
            </div>

            {/* Photo Section */}
            <div className="group">
              <label className="block mb-3 text-lg font-semibold text-gray-800 flex items-center">
                <span className="mr-2">📸</span>
                Add a photo
                <span className="ml-2 text-sm font-normal text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  Recommended
                </span>
              </label>
              
              {!imagePreview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-emerald-400 transition-colors duration-200 group-hover:border-gray-400">
                  <div className="mb-4">
                    <span className="text-4xl">📷</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer inline-block bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                  >
                    Choose Photo
                  </label>
                  <p className="text-gray-600 mt-2 text-sm">
                    Clear photos get 5x more interest! Show your gear in action.
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Gear preview"
                    className="w-full max-h-80 object-cover rounded-xl border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors duration-200"
                  >
                    <span className="text-sm">✕</span>
                  </button>
                  <div className="mt-3 text-center">
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Change photo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Group Selection Section */}
            <div className="group">
              <label className="block mb-3 text-lg font-semibold text-gray-800 flex items-center">
                <span className="mr-2">👥</span>
                Share with groups
                {loadingGroups && (
                  <span className="ml-2 text-sm font-normal text-gray-500">Loading...</span>
                )}
              </label>
              
              {groups.length === 0 && !loadingGroups ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-yellow-800 text-sm">
                    <span className="mr-1">ℹ️</span>
                    You're not in any groups yet. Your gear will be private until you join or create a group.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">
                      Select which groups can see this gear
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedGroups(new Set(groups.map(g => g.id)))}
                        className="text-xs text-emerald-600 hover:text-emerald-700 underline"
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
                  
                  <div className="grid gap-3 max-h-48 overflow-y-auto">
                    {groups.map((group) => (
                      <label
                        key={group.id}
                        className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
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
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">{group.name}</span>
                            <span className="text-xs text-gray-500">
                              {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <span className="text-xs text-emerald-600 capitalize">
                            Your role: {group.userRole}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                  
                  {selectedGroups.size === 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-orange-800 text-sm">
                        <span className="mr-1">⚠️</span>
                        No groups selected. Your gear will be private and not visible to anyone.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Section */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">Ready to share?</h3>
                  <p className="text-gray-600 text-sm">Your gear will be visible to your trusted network</p>
                </div>
                <span className="text-3xl">🤝</span>
              </div>
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sharing your gear...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <span className="mr-2">�️</span>
                    Share My Gear
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Trust & Safety Note */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start">
            <span className="text-2xl mr-3">🛡️</span>
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">Trust & Safety</h3>
              <p className="text-blue-700 text-sm leading-relaxed">
                Your gear is only visible to people in your trusted groups. We recommend starting with close friends and expanding your network gradually as you build confidence in the community.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
