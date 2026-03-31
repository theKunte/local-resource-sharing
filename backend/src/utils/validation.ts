/**
 * Input Validation Utilities
 */

// Allowed image MIME types — SVG, HTML, and other script-capable types are blocked
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// Magic byte signatures for each type
const MAGIC_BYTES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // "RIFF"
};

/**
 * Validates a base64 data URI image for safe content type and matching magic bytes.
 * Blocks SVG (can contain scripts), HTML, and all non-raster formats.
 */
export function validateBase64Image(dataUri: string): {
  valid: boolean;
  error?: string;
} {
  // Mitigate ReDoS: limit input size and use non-greedy regex
  if (typeof dataUri !== "string" || dataUri.length > 100000) {
    return {
      valid: false,
      error: "Image data URI is too large or not a string",
    };
  }
  // Non-greedy match for base64 data, avoids catastrophic backtracking
  const dataUriRegex = /^data:([\w/+-]+);base64,(.+?)$/;
  const match = dataUri.match(dataUriRegex);
  if (!match) {
    return {
      valid: false,
      error: "Invalid image format: must be a base64 data URI",
    };
  }

  const mimeType = match[1].toLowerCase();
  const base64Data = match[2];

  // Check MIME type is in allowlist
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType as any)) {
    return {
      valid: false,
      error: `Image type "${mimeType}" is not allowed. Use JPEG, PNG, or WebP.`,
    };
  }

  // Validate base64 is well-formed (check a reasonable prefix)
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  const sampleChunk = base64Data.slice(0, 1000);
  if (!base64Regex.test(sampleChunk.replace(/\s/g, ""))) {
    return { valid: false, error: "Invalid base64 encoding" };
  }

  // Decode first few bytes and verify magic bytes match declared type
  try {
    const binaryChunk = Buffer.from(base64Data.slice(0, 32), "base64");
    const expectedSignatures = MAGIC_BYTES[mimeType];
    if (expectedSignatures) {
      const matchesMagic = expectedSignatures.some((sig) =>
        sig.every((byte, i) => binaryChunk[i] === byte),
      );
      if (!matchesMagic) {
        return {
          valid: false,
          error: "Image content does not match declared type",
        };
      }
    }
  } catch {
    return { valid: false, error: "Failed to decode image data" };
  }

  return { valid: true };
}

export function validateEmail(email: string): boolean {
  if (email.length > 254) return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.length > 64) return false;
  if (!domain || domain.length > 253) return false;
  const domainParts = domain.split(".");
  if (domainParts.length < 2) return false;
  if (domainParts.some((p) => !p || p.length > 63)) return false;
  if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;
  if (domainParts.some((p) => !/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(p))) return false;
  return true;
}

export function sanitizeString(
  str: string | undefined | null,
  maxLength: number = 500,
): string {
  if (!str) return "";
  return str.trim().slice(0, maxLength);
}

export function validateResourceInput(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.title || data.title.trim().length < 3) {
    errors.push("Title must be at least 3 characters");
  }
  if (data.title && data.title.length > 200) {
    errors.push("Title must be less than 200 characters");
  }
  if (!data.description || data.description.trim().length < 10) {
    errors.push("Description must be at least 10 characters");
  }
  if (data.description && data.description.length > 2000) {
    errors.push("Description must be less than 2000 characters");
  }
  // Image validation - only check if explicitly checking for new resource (not update)
  if (
    data.image !== undefined &&
    (!data.image || data.image.trim().length === 0)
  ) {
    errors.push("Image is required");
  }
  if (!data.ownerId) {
    errors.push("Owner ID is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateGroupInput(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length < 3) {
    errors.push("Group name must be at least 3 characters");
  }
  if (data.name && data.name.length > 100) {
    errors.push("Group name must be less than 100 characters");
  }
  if (!data.createdById) {
    errors.push("Creator ID is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
