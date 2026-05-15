import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock firebase with null auth and app
vi.mock("../../firebase", () => ({
  auth: null,
  app: null,
  getFirebaseAuth: vi.fn(() => null),
  getFirebaseApp: vi.fn(() => null),
  initializeFirebase: vi.fn().mockResolvedValue(undefined),
}));

// Mock firebase/storage
vi.mock("firebase/storage", () => ({
  getStorage: vi.fn(() => null),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

import { uploadImageToStorage, uploadBlobToStorage } from "../firebaseStorage";

describe("firebaseStorage - null auth/storage handling", () => {
  it("uploadImageToStorage throws error when Firebase not initialized", async () => {
    const file = new File(["test"], "test.png", { type: "image/png" });

    await expect(uploadImageToStorage(file, "resources")).rejects.toThrow(
      "Firebase not initialized",
    );
  });

  it("uploadBlobToStorage throws error when Firebase not initialized", async () => {
    const blob = new Blob(["test"], { type: "image/png" });

    await expect(
      uploadBlobToStorage(blob, "resources", "test.png"),
    ).rejects.toThrow("Firebase not initialized");
  });
});

describe("firebaseStorage - authenticated upload flows", () => {
  const mockRef = vi.fn();
  const mockUploadBytes = vi.fn();
  const mockGetDownloadURL = vi.fn();
  const mockGetStorage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset and reconfigure mocks for authenticated state
    vi.resetModules();

    // Mock firebase/storage functions
    vi.doMock("firebase/storage", () => ({
      getStorage: mockGetStorage,
      ref: mockRef,
      uploadBytes: mockUploadBytes,
      getDownloadURL: mockGetDownloadURL,
    }));

    // Mock firebase with authenticated user and storage
    vi.doMock("../../firebase", () => ({
      auth: {
        currentUser: { uid: "user123" },
      },
      app: { name: "[DEFAULT]" },
    }));

    mockGetStorage.mockReturnValue({ bucket: "test-bucket" });
  });

  it("uploadImageToStorage uploads file and returns download URL", async () => {
    const mockStorageRef = { fullPath: "resources/user123/12345_test.png" };
    const mockDownloadURL = "https://firebase.storage.app/image.png";
    const mockSnapshot = { ref: mockStorageRef };

    mockRef.mockReturnValue(mockStorageRef);
    mockUploadBytes.mockResolvedValue(mockSnapshot);
    mockGetDownloadURL.mockResolvedValue(mockDownloadURL);

    // Re-import after mocking
    const { uploadImageToStorage: uploadImage } =
      await import("../firebaseStorage");

    const file = new File(["content"], "test.png", { type: "image/png" });
    const url = await uploadImage(file, "resources");

    expect(url).toBe(mockDownloadURL);
    expect(mockUploadBytes).toHaveBeenCalledWith(mockStorageRef, file, {
      contentType: "image/png",
      cacheControl: "public, max-age=31536000",
    });
    expect(mockGetDownloadURL).toHaveBeenCalledWith(mockStorageRef);
  });

  it("uploadImageToStorage sanitizes file names with special characters", async () => {
    const mockStorageRef = {
      fullPath: "resources/user123/12345_my_gear____.png",
    };
    const mockDownloadURL = "https://firebase.storage.app/sanitized.png";
    const mockSnapshot = { ref: mockStorageRef };

    mockRef.mockReturnValue(mockStorageRef);
    mockUploadBytes.mockResolvedValue(mockSnapshot);
    mockGetDownloadURL.mockResolvedValue(mockDownloadURL);

    const { uploadImageToStorage: uploadImage } =
      await import("../firebaseStorage");

    const file = new File(["content"], "my gear!@#$.png", {
      type: "image/png",
    });
    await uploadImage(file, "resources");

    // Verify ref was called with sanitized path (5 special chars become underscores)
    expect(mockRef).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringMatching(/my_gear____\.png$/),
    );
  });

  it("uploadImageToStorage throws when user not authenticated", async () => {
    // Mock firebase with no current user
    vi.doMock("../../firebase", () => ({
      auth: {
        currentUser: null,
      },
      app: { name: "[DEFAULT]" },
    }));

    mockGetStorage.mockReturnValue({ bucket: "test-bucket" });

    const { uploadImageToStorage: uploadImage } =
      await import("../firebaseStorage");

    const file = new File(["content"], "test.png", { type: "image/png" });

    await expect(uploadImage(file, "resources")).rejects.toThrow(
      "Must be authenticated to upload images",
    );
  });

  it("uploadBlobToStorage uploads blob and returns download URL", async () => {
    const mockStorageRef = { fullPath: "resources/user123/12345_avatar.jpg" };
    const mockDownloadURL = "https://firebase.storage.app/blob.jpg";
    const mockSnapshot = { ref: mockStorageRef };

    mockRef.mockReturnValue(mockStorageRef);
    mockUploadBytes.mockResolvedValue(mockSnapshot);
    mockGetDownloadURL.mockResolvedValue(mockDownloadURL);

    const { uploadBlobToStorage: uploadBlob } =
      await import("../firebaseStorage");

    const blob = new Blob(["binary"], { type: "image/jpeg" });
    const url = await uploadBlob(blob, "resources", "avatar.jpg");

    expect(url).toBe(mockDownloadURL);
    expect(mockUploadBytes).toHaveBeenCalledWith(mockStorageRef, blob, {
      contentType: "image/jpeg",
      cacheControl: "public, max-age=31536000",
    });
  });
});
