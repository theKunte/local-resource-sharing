import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth } from "../firebase";

const storage = getStorage();

/**
 * Uploads an image file to Firebase Storage and returns the download URL.
 * Images are stored under the authenticated user's directory.
 */
export async function uploadImageToStorage(
  file: File,
  path: string,
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Must be authenticated to upload images");
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageRef = ref(
    storage,
    `${path}/${user.uid}/${timestamp}_${safeName}`,
  );

  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
  });

  return getDownloadURL(snapshot.ref);
}

/**
 * Uploads a canvas-generated blob (from crop/resize) to Firebase Storage.
 */
export async function uploadBlobToStorage(
  blob: Blob,
  path: string,
  filename: string,
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Must be authenticated to upload images");
  }

  const timestamp = Date.now();
  const storageRef = ref(
    storage,
    `${path}/${user.uid}/${timestamp}_${filename}`,
  );

  const snapshot = await uploadBytes(storageRef, blob, {
    contentType: blob.type,
  });

  return getDownloadURL(snapshot.ref);
}
