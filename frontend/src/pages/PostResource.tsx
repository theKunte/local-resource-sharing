import { useState } from "react";
import axios from "axios";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";

export default function PostResource() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user, loading } = useFirebaseAuth();

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
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("You must be logged in to post a resource.");
      return;
    }
    setSubmitting(true);

    let imageData: string | undefined = undefined;
    if (image) {
      imageData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(image);
      });
    }

    await axios.post("http://localhost:3001/api/resources", {
      title,
      description,
      image: imageData,
      ownerId: user.uid, // FIX: use ownerId, not user
    });

    setTitle("");
    setDescription("");
    setImage(null);
    setImagePreview(null);
    setSubmitting(false);
    alert("Resource submitted!");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 lg:px-12 py-12">
      <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
        🛠️ Share a Tool
      </h1>

      <div className="bg-white p-6 sm:p-10 rounded-none shadow-lg border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="mb-4">
            <label className="block mb-3 text-base font-medium text-gray-700">
              Tool Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g., Cordless Drill"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-4 text-base font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={6}
              placeholder="Briefly describe how it can be used and availability"
              className="w-full px-4 py-3 border border-gray-300 square-lg text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-3 text-base font-medium text-gray-700">
              Tool Image (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {imagePreview && (
              <div className="mt-4 flex justify-center">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-full max-h-60 w-auto h-auto rounded-xl border border-gray-200 shadow object-contain"
                  style={{ maxWidth: "100%", maxHeight: "15rem" }}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "📤 Submit Tool"}
          </button>
        </form>
      </div>
    </div>
  );
}
