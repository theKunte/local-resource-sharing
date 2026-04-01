import { cropImageToSquare } from "../cropImageToSquare";

function createMockFile(name = "test.png") {
  return new File(["fake-data"], name, { type: "image/png" });
}

function setupMocks(imgWidth: number, imgHeight: number, triggerError = false) {
  const ctx = {
    drawImage: vi.fn(),
  };
  const canvas = {
    getContext: vi.fn(() => ctx),
    toBlob: vi.fn((cb: (blob: Blob | null) => void, type: string) => {
      cb(new Blob(["fake-image-data"], { type: type || "image/png" }));
    }),
    width: 0,
    height: 0,
  };
  vi.spyOn(document, "createElement").mockReturnValue(canvas as any);

  // Override window.Image as a constructor
  const origImage = window.Image;
  (window as any).Image = class MockImage {
    width = imgWidth;
    height = imgHeight;
    onload: (() => void) | null = null;
    onerror: ((e: any) => void) | null = null;
    set src(_val: string) {
      if (triggerError) {
        setTimeout(() => this.onerror?.(new Error("img fail")), 0);
      } else {
        setTimeout(() => this.onload?.(), 0);
      }
    }
  };

  // Override FileReader
  const origFileReader = window.FileReader;
  (window as any).FileReader = class MockFileReader {
    onload: ((e: any) => void) | null = null;
    onerror: ((e: any) => void) | null = null;
    readAsDataURL(_file: File) {
      setTimeout(
        () =>
          this.onload?.({
            target: { result: "data:image/png;base64,fakedata" },
          }),
        0,
      );
    }
  };

  return {
    canvas,
    ctx,
    restore() {
      window.Image = origImage;
      (window as any).FileReader = origFileReader;
    },
  };
}

describe("cropImageToSquare", () => {
  let restoreFn: () => void;

  afterEach(() => {
    restoreFn?.();
    vi.restoreAllMocks();
  });

  it("crops a landscape image to square", async () => {
    const { ctx, restore } = setupMocks(200, 100);
    restoreFn = restore;
    const result = await cropImageToSquare(createMockFile());

    expect(result).toBeInstanceOf(Blob);
    expect(ctx.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      50,
      0,
      100,
      100,
      0,
      0,
      128,
      128,
    );
  });

  it("crops a portrait image to square", async () => {
    const { ctx, restore } = setupMocks(100, 200);
    restoreFn = restore;
    const result = await cropImageToSquare(createMockFile());

    expect(result).toBeInstanceOf(Blob);
    expect(ctx.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      50,
      100,
      100,
      0,
      0,
      128,
      128,
    );
  });

  it("handles already square image", async () => {
    const { ctx, restore } = setupMocks(100, 100);
    restoreFn = restore;
    const result = await cropImageToSquare(createMockFile());

    expect(result).toBeInstanceOf(Blob);
    expect(ctx.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      100,
      100,
      0,
      0,
      128,
      128,
    );
  });

  it("rejects on image load error", async () => {
    const { restore } = setupMocks(100, 100, true);
    restoreFn = restore;
    await expect(cropImageToSquare(createMockFile())).rejects.toBeTruthy();
  });
});
