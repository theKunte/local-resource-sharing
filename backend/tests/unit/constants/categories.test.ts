/**
 * Tests for category validation and sanitization
 */
import {
  CATEGORIES,
  isValidCategory,
  sanitizeCategories,
} from "../../../src/constants/categories";

describe("Category Constants and Validation", () => {
  describe("CATEGORIES constant", () => {
    it("should contain exactly 12 categories", () => {
      expect(CATEGORIES).toHaveLength(12);
    });

    it("should include expected categories", () => {
      expect(CATEGORIES).toContain("Shelter & Sleep Systems");
      expect(CATEGORIES).toContain("Packs & Bags");
      expect(CATEGORIES).toContain("Water Sports");
      expect(CATEGORIES).toContain("Climbing & Mountaineering");
      expect(CATEGORIES).toContain("Other");
    });

    it("should not contain duplicate categories", () => {
      const uniqueCategories = new Set(CATEGORIES);
      expect(uniqueCategories.size).toBe(CATEGORIES.length);
    });

    it("should have all categories as strings", () => {
      CATEGORIES.forEach((category) => {
        expect(typeof category).toBe("string");
      });
    });
  });

  describe("isValidCategory()", () => {
    it("should return true for valid categories", () => {
      expect(isValidCategory("Shelter & Sleep Systems")).toBe(true);
      expect(isValidCategory("Packs & Bags")).toBe(true);
      expect(isValidCategory("Climbing & Mountaineering")).toBe(true);
      expect(isValidCategory("Other")).toBe(true);
    });

    it("should return false for invalid categories", () => {
      expect(isValidCategory("InvalidCategory")).toBe(false);
      expect(isValidCategory("CLIMBING")).toBe(false); // Case sensitive
      expect(isValidCategory("climbing")).toBe(false);
      expect(isValidCategory("")).toBe(false);
    });

    it("should return false for non-string inputs", () => {
      expect(isValidCategory(123)).toBe(false);
      expect(isValidCategory(null)).toBe(false);
      expect(isValidCategory(undefined)).toBe(false);
      expect(isValidCategory({})).toBe(false);
      expect(isValidCategory([])).toBe(false);
    });
  });

  describe("sanitizeCategories() - Security Tests", () => {
    describe("Whitelist Validation", () => {
      it("should filter out invalid categories", () => {
        const result = sanitizeCategories([
          "Climbing & Mountaineering",
          "InvalidCategory",
          "Water Sports",
        ]);
        expect(result).toEqual(["Climbing & Mountaineering", "Water Sports"]);
      });

      it("should reject categories with different casing", () => {
        const result = sanitizeCategories([
          "CLIMBING",
          "climbing",
          "Climbing & Mountaineering",
        ]);
        expect(result).toEqual(["Climbing & Mountaineering"]); // Only exact match
      });

      it("should reject SQL injection attempts", () => {
        const result = sanitizeCategories([
          "Climbing & Mountaineering' OR '1'='1",
          "Climbing & Mountaineering; DROP TABLE resources;",
          "Climbing & Mountaineering",
        ]);
        expect(result).toEqual(["Climbing & Mountaineering"]);
      });

      it("should reject XSS attempts in categories", () => {
        const result = sanitizeCategories([
          "<script>alert('xss')</script>",
          "Climbing & Mountaineering<script>",
          "Climbing & Mountaineering",
        ]);
        expect(result).toEqual(["Climbing & Mountaineering"]);
      });

      it("should reject path traversal attempts", () => {
        const result = sanitizeCategories([
          "../../../etc/passwd",
          "Climbing & Mountaineering/../Admin",
          "Climbing & Mountaineering",
        ]);
        expect(result).toEqual(["Climbing & Mountaineering"]);
      });
    });

    describe("Duplicate Removal", () => {
      it("should remove duplicate categories", () => {
        const result = sanitizeCategories([
          "Climbing & Mountaineering",
          "Water Sports",
          "Climbing & Mountaineering",
          "Water Sports",
        ]);
        expect(result).toEqual(["Climbing & Mountaineering", "Water Sports"]);
      });

      it("should handle array with all duplicates", () => {
        const result = sanitizeCategories([
          "Climbing & Mountaineering",
          "Climbing & Mountaineering",
          "Climbing & Mountaineering",
          "Climbing & Mountaineering",
        ]);
        expect(result).toEqual(["Climbing & Mountaineering"]);
      });
    });

    describe("Max Count Limit", () => {
      it("should enforce default max of 5 categories", () => {
        const result = sanitizeCategories([
          "Climbing & Mountaineering",
          "Water Sports",
          "Snow Sports",
          "Cycling",
          "Navigation & Safety",
          "Packs & Bags", // 6th should be ignored
          "Other",
        ]);
        expect(result).toHaveLength(5);
      });

      it("should enforce custom maxCount parameter", () => {
        const result = sanitizeCategories(
          [
            "Climbing & Mountaineering",
            "Water Sports",
            "Snow Sports",
            "Cycling",
          ],
          2,
        );
        expect(result).toHaveLength(2);
        expect(result).toEqual(["Climbing & Mountaineering", "Water Sports"]);
      });

      it("should handle maxCount of 1", () => {
        const result = sanitizeCategories(
          ["Climbing & Mountaineering", "Water Sports", "Snow Sports"],
          1,
        );
        expect(result).toEqual(["Climbing & Mountaineering"]);
      });

      it("should allow maxCount larger than array", () => {
        const result = sanitizeCategories(
          ["Climbing & Mountaineering", "Water Sports"],
          10,
        );
        expect(result).toEqual(["Climbing & Mountaineering", "Water Sports"]);
      });
    });

    describe("Input Type Handling", () => {
      it("should handle single string input", () => {
        const result = sanitizeCategories("Climbing & Mountaineering");
        expect(result).toEqual(["Climbing & Mountaineering"]);
      });

      it("should handle empty string", () => {
        const result = sanitizeCategories("");
        expect(result).toEqual([]);
      });

      it("should handle empty array", () => {
        const result = sanitizeCategories([]);
        expect(result).toEqual([]);
      });

      it("should handle null and undefined", () => {
        expect(sanitizeCategories(null)).toEqual([]);
        expect(sanitizeCategories(undefined)).toEqual([]);
      });

      it("should handle non-string array elements", () => {
        const result = sanitizeCategories([
          "Climbing & Mountaineering",
          123,
          null,
          undefined,
          "Water Sports",
          {},
          "Cycling",
        ] as any);
        expect(result).toEqual([
          "Climbing & Mountaineering",
          "Water Sports",
          "Cycling",
        ]);
      });

      it("should handle object input", () => {
        const result = sanitizeCategories({ invalid: "object" } as any);
        expect(result).toEqual([]);
      });

      it("should handle number input", () => {
        const result = sanitizeCategories(123 as any);
        expect(result).toEqual([]);
      });
    });

    describe("Whitespace Handling", () => {
      it("should trim whitespace from categories", () => {
        const result = sanitizeCategories([
          "  Climbing & Mountaineering  ",
          " Water Sports ",
          "Cycling",
        ]);
        expect(result).toEqual([
          "Climbing & Mountaineering",
          "Water Sports",
          "Cycling",
        ]);
      });

      it("should remove empty strings after trimming", () => {
        const result = sanitizeCategories([
          "Climbing & Mountaineering",
          "   ",
          "",
          "Water Sports",
          "  ",
        ]);
        expect(result).toEqual(["Climbing & Mountaineering", "Water Sports"]);
      });

      it("should handle tabs and newlines", () => {
        const result = sanitizeCategories([
          "\tClimbing & Mountaineering\n",
          "\r\nWater Sports\r",
          "Cycling",
        ]);
        expect(result).toEqual([
          "Climbing & Mountaineering",
          "Water Sports",
          "Cycling",
        ]);
      });
    });

    describe("Edge Cases", () => {
      it("should handle very long invalid input gracefully", () => {
        const longInvalidCategory = "Invalid".repeat(1000);
        const result = sanitizeCategories([
          "Climbing & Mountaineering",
          longInvalidCategory,
          "Water Sports",
        ]);
        expect(result).toEqual(["Climbing & Mountaineering", "Water Sports"]);
      });

      it("should handle array with 100 invalid categories", () => {
        const invalidCategories = Array(100).fill("InvalidCategory");
        const result = sanitizeCategories([
          ...invalidCategories,
          "Climbing & Mountaineering",
          "Water Sports",
        ]);
        expect(result).toEqual(["Climbing & Mountaineering", "Water Sports"]);
      });

      it("should preserve order of valid categories", () => {
        const result = sanitizeCategories([
          "Water Sports",
          "Climbing & Mountaineering",
          "Cycling",
          "Snow Sports",
        ]);
        expect(result).toEqual([
          "Water Sports",
          "Climbing & Mountaineering",
          "Cycling",
          "Snow Sports",
        ]);
      });
    });

    describe("Real-World Attack Scenarios", () => {
      it("should handle combined SQL injection and XSS", () => {
        const result = sanitizeCategories([
          "Climbing & Mountaineering' OR 1=1--<script>alert('xss')</script>",
          "Climbing & Mountaineering",
        ]);
        expect(result).toEqual(["Climbing & Mountaineering"]);
      });

      it("should handle Unicode normalization attacks", () => {
        const result = sanitizeCategories([
          "Climbing & Mountaineering\u0000", // Null byte
          "Climbing & Mountaineering\uFEFF", // Zero-width no-break space
          "Climbing & Mountaineering",
        ]);
        expect(result).toEqual(["Climbing & Mountaineering"]);
      });

      it("should handle category name spoofing attempts", () => {
        const result = sanitizeCategories([
          "Clіmbing & Mountaineering", // Cyrillic 'і' instead of Latin 'i'
          "Climbing & Mountaineering",
        ]);
        expect(result).toEqual(["Climbing & Mountaineering"]); // Only the real one
      });
    });
  });
});
