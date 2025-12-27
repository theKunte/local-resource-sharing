/**
 * Input Validation Utilities
 */

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeString(str: string, maxLength: number = 500): string {
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
