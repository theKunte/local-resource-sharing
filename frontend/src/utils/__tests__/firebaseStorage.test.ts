import { describe, it, expect, vi } from "vitest";

// Mock firebase with null auth and app
vi.mock("../../firebase", () => ({
  auth: null,
  app: null,
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
