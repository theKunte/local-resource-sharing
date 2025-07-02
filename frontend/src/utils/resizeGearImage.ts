// This utility resizes gear images to a consistent size (600x400px, 3:2 aspect ratio) using a canvas.
export async function resizeGearImage(
  file: File,
  width: number = 600,
  height: number = 400,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) return reject("No canvas context");

        // Calculate scaling to maintain aspect ratio and fill the canvas
        const sourceAspectRatio = img.width / img.height;
        const targetAspectRatio = width / height;

        let sx = 0,
          sy = 0,
          sWidth = img.width,
          sHeight = img.height;

        if (sourceAspectRatio > targetAspectRatio) {
          // Source is wider, crop from sides
          sWidth = img.height * targetAspectRatio;
          sx = (img.width - sWidth) / 2;
        } else {
          // Source is taller, crop from top/bottom
          sHeight = img.width / targetAspectRatio;
          sy = (img.height - sHeight) / 2;
        }

        // Fill with white background first
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        // Draw the cropped and resized image
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, width, height);

        // Convert to JPEG with specified quality to reduce file size
        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.onerror = reject;
      img.src = e.target?.result as string;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
