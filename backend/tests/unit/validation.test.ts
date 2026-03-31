import {
  validateEmail,
  sanitizeString,
  validateResourceInput,
  validateGroupInput,
  validateBase64Image,
} from "../../src/utils/validation";

describe("validateEmail", () => {
  it("accepts valid emails", () => {
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("name+tag@domain.co")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(validateEmail("")).toBe(false);
    expect(validateEmail("not-an-email")).toBe(false);
    expect(validateEmail("@missing-local.com")).toBe(false);
    expect(validateEmail("missing@.com")).toBe(false);
    expect(validateEmail("spaces in@email.com")).toBe(false);
  });
});

describe("sanitizeString", () => {
  it("trims whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello");
  });

  it("truncates to maxLength", () => {
    expect(sanitizeString("abcdefghij", 5)).toBe("abcde");
  });

  it("returns empty string for null/undefined", () => {
    expect(sanitizeString(null)).toBe("");
    expect(sanitizeString(undefined)).toBe("");
  });

  it("uses default maxLength of 500", () => {
    const longStr = "a".repeat(600);
    expect(sanitizeString(longStr).length).toBe(500);
  });
});

describe("validateResourceInput", () => {
  const validInput = {
    title: "My Tool",
    description: "A great tool for doing stuff",
    ownerId: "user-123",
    image: "data:image/png;base64,abc",
  };

  it("returns valid for correct input", () => {
    const result = validateResourceInput(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("requires title of at least 3 characters", () => {
    const result = validateResourceInput({ ...validInput, title: "ab" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Title must be at least 3 characters");
  });

  it("rejects title over 200 characters", () => {
    const result = validateResourceInput({
      ...validInput,
      title: "a".repeat(201),
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Title must be less than 200 characters");
  });

  it("requires description of at least 10 characters", () => {
    const result = validateResourceInput({
      ...validInput,
      description: "short",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Description must be at least 10 characters",
    );
  });

  it("rejects description over 2000 characters", () => {
    const result = validateResourceInput({
      ...validInput,
      description: "a".repeat(2001),
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Description must be less than 2000 characters",
    );
  });

  it("requires ownerId", () => {
    const result = validateResourceInput({ ...validInput, ownerId: "" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Owner ID is required");
  });

  it("requires image when explicitly provided as empty", () => {
    const result = validateResourceInput({ ...validInput, image: "" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Image is required");
  });

  it("collects multiple errors", () => {
    const result = validateResourceInput({
      title: "",
      description: "",
      ownerId: "",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe("validateGroupInput", () => {
  it("returns valid for correct input", () => {
    const result = validateGroupInput({
      name: "Book Club",
      createdById: "user-1",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("requires name of at least 3 characters", () => {
    const result = validateGroupInput({ name: "ab", createdById: "user-1" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Group name must be at least 3 characters");
  });

  it("rejects name over 100 characters", () => {
    const result = validateGroupInput({
      name: "a".repeat(101),
      createdById: "user-1",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Group name must be less than 100 characters",
    );
  });

  it("requires createdById", () => {
    const result = validateGroupInput({ name: "Valid Name", createdById: "" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Creator ID is required");
  });
});

describe("validateBase64Image", () => {
  // Minimal valid JPEG: FFD8FF as base64 = /9j/
  const validJpegUri = "data:image/jpeg;base64,/9j/4AAQ";
  // Minimal valid PNG: 89504E47 as base64 = iVBORw==
  const validPngUri = "data:image/png;base64,iVBORw==";

  it("rejects non-string input", () => {
    const result = validateBase64Image(123 as any);
    expect(result.valid).toBe(false);
  });

  it("rejects oversized input", () => {
    const big = "data:image/jpeg;base64," + "a".repeat(200000);
    const result = validateBase64Image(big);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too large");
  });

  it("rejects invalid data URI format", () => {
    const result = validateBase64Image("not-a-data-uri");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid image format");
  });

  it("rejects disallowed MIME types like SVG", () => {
    const result = validateBase64Image("data:image/svg+xml;base64,abc123");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not allowed");
  });

  it("rejects content that doesn't match declared type", () => {
    // Declare JPEG but provide PNG magic bytes
    const result = validateBase64Image("data:image/jpeg;base64,iVBORw==");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("does not match");
  });

  it("accepts valid JPEG data URI", () => {
    const result = validateBase64Image(validJpegUri);
    expect(result.valid).toBe(true);
  });

  it("accepts valid PNG data URI", () => {
    const result = validateBase64Image(validPngUri);
    expect(result.valid).toBe(true);
  });
});
