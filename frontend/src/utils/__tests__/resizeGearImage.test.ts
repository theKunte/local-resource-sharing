import { resizeGearImage } from "../resizeGearImage";

function createMockFile(name = "test.png") {
  return new File(["fake-data"], name, { type: "image/png" });
}

function setupMocks(imgWidth: number, imgHeight: number, triggerError = false) {
  const ctx = {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "",
  };
  const canvas = {
    getContext: vi.fn(() => ctx),
    toDataURL: vi.fn(() => "data:image/jpeg;base64,resized"),
    width: 0,
    height: 0,
  };
  vi.spyOn(document, "createElement").mockReturnValue(canvas as any);

  const origImage = window.Image;
  (window as any).Image = class MockImage {
    width = imgWidth;
    height = imgHeight;
    onload: (() => void) | null = null;
    onerror: ((e: any) => void) | null = null;
    set src(_val: string) {
      if (triggerError) {
        setTimeout(() => this.onerror?.(new Error("load failed")), 0);
      } else {
        setTimeout(() => this.onload?.(), 0);
      }
    }
  };

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

describe("resizeGearImage", () => {
  let restoreFn: () => void;

  afterEach(() => {
    restoreFn?.();
    vi.restoreAllMocks();
  });

  it("resizes a large landscape image", async () => {
    const { ctx, restore } = setupMocks(2000, 1000);
    restoreFn = restore;
    const result = await resizeGearImage(createMockFile());

    expect(result).toBe("data:image/jpeg;base64,resized");
    expect(ctx.drawImage).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 600, 400);
  });

  it("resizes a portrait image", async () => {
    const { ctx, restore } = setupMocks(500, 2000);
    restoreFn = restore;
    const result = await resizeGearImage(createMockFile());

    expect(result).toBe("data:image/jpeg;base64,resized");
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it("handles square image", async () => {
    const { ctx, restore } = setupMocks(100, 100);
    restoreFn = restore;
    const result = await resizeGearImage(createMockFile());

    expect(result).toBe("data:image/jpeg;base64,resized");
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it("rejects on image load error", async () => {
    const { restore } = setupMocks(100, 100, true);
    restoreFn = restore;
    await expect(resizeGearImage(createMockFile())).rejects.toBeTruthy();
  });
});
