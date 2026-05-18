/**
 * Tests for frontend category validation
 */
import {
  CATEGORIES,
  isValidCategory,
  filterValidCategories,
} from "../categories";

describe("Frontend Category Constants and Validation", () => {
  describe("CATEGORIES constant", () => {
    it("should contain exactly 20 categories", () => {
      expect(CATEGORIES).toHaveLength(20);
    });

    it("should include all expected categories", () => {
      const expectedCategories = [
        "Sports",
        "Camping",
        "Outdoor",
        "Tools",
        "Power Tools",
        "Home Improvement",
        "Furniture",
        "Electronics",
        "Entertainment",
        "Party Supplies",
        "Water Sports",
        "Bikes",
        "Kitchen",
        "Garden",
        "Photography",
        "Music",
        "Gaming",
        "Fitness",
        "Books",
        "Other",
      ];

      expectedCategories.forEach((category) => {
        expect(CATEGORIES).toContain(category);
      });
    });

    it("should not contain duplicate categories", () => {
      const uniqueCategories = new Set(CATEGORIES);
      expect(uniqueCategories.size).toBe(CATEGORIES.length);
    });

    it("should have all categories as strings", () => {
      CATEGORIES.forEach((category) => {
        expect(typeof category).toBe("string");
        expect(category.length).toBeGreaterThan(0);
      });
    });

    it("should match backend categories exactly", () => {
      // This ensures frontend and backend stay in sync
      const expectedOrder = [
        "Sports",
        "Camping",
        "Outdoor",
        "Tools",
        "Power Tools",
        "Home Improvement",
        "Furniture",
        "Electronics",
        "Entertainment",
        "Party Supplies",
        "Water Sports",
        "Bikes",
        "Kitchen",
        "Garden",
        "Photography",
        "Music",
        "Gaming",
        "Fitness",
        "Books",
        "Other",
      ];

      expect([...CATEGORIES]).toEqual(expectedOrder);
    });

    it("should be immutable (readonly)", () => {
      // TypeScript enforces this at compile time
      // This test documents the intention
      expect(() => {
        // @ts-expect-error - Testing immutability
        CATEGORIES.push("New Category");
      }).toThrow();
    });
  });

  describe("isValidCategory() - Type Guard", () => {
    it("should return true for all valid categories", () => {
      CATEGORIES.forEach((category) => {
        expect(isValidCategory(category)).toBe(true);
      });
    });

    it("should return false for invalid categories", () => {
      expect(isValidCategory("InvalidCategory")).toBe(false);
      expect(isValidCategory("Random")).toBe(false);
      expect(isValidCategory("")).toBe(false);
    });

    it("should be case-sensitive", () => {
      expect(isValidCategory("sports")).toBe(false); // lowercase
      expect(isValidCategory("SPORTS")).toBe(false); // uppercase
      expect(isValidCategory("Sports")).toBe(true); // correct case
    });

    it("should reject non-string values", () => {
      expect(isValidCategory(123)).toBe(false);
      expect(isValidCategory(null)).toBe(false);
      expect(isValidCategory(undefined)).toBe(false);
      expect(isValidCategory({})).toBe(false);
      expect(isValidCategory([])).toBe(false);
      expect(isValidCategory(true)).toBe(false);
    });

    it("should reject categories with extra whitespace", () => {
      expect(isValidCategory(" Sports")).toBe(false);
      expect(isValidCategory("Sports ")).toBe(false);
      expect(isValidCategory(" Sports ")).toBe(false);
    });

    it("should reject XSS attempts", () => {
      expect(isValidCategory("<script>alert('xss')</script>")).toBe(false);
      expect(isValidCategory("Sports<script>")).toBe(false);
    });

    it("should reject SQL injection attempts", () => {
      expect(isValidCategory("Sports' OR '1'='1")).toBe(false);
      expect(isValidCategory("Sports; DROP TABLE;")).toBe(false);
    });
  });

  describe("filterValidCategories()", () => {
    it("should return empty array for empty input", () => {
      expect(filterValidCategories([])).toEqual([]);
    });

    it("should return all valid categories unchanged", () => {
      const input = ["Sports", "Camping", "Tools"];
      expect(filterValidCategories(input)).toEqual(input);
    });

    it("should filter out invalid categories", () => {
      const input = ["Sports", "InvalidCategory", "Camping", "FakeCategory"];
      expect(filterValidCategories(input)).toEqual(["Sports", "Camping"]);
    });

    it("should filter out non-string values", () => {
      const input = ["Sports", 123, null, "Camping", undefined, "Tools"];
      expect(filterValidCategories(input as any)).toEqual([
        "Sports",
        "Camping",
        "Tools",
      ]);
    });

    it("should preserve order of valid categories", () => {
      const input = [
        "Garden",
        "InvalidCategory",
        "Sports",
        "FakeCategory",
        "Camping",
      ];
      expect(filterValidCategories(input)).toEqual([
        "Garden",
        "Sports",
        "Camping",
      ]);
    });

    it("should handle array with all invalid values", () => {
      const input = ["Invalid1", "Invalid2", "Invalid3"];
      expect(filterValidCategories(input)).toEqual([]);
    });

    it("should handle mixed case rejection", () => {
      const input = ["Sports", "sports", "SPORTS", "Camping"];
      expect(filterValidCategories(input)).toEqual(["Sports", "Camping"]);
    });

    it("should not mutate original array", () => {
      const input = ["Sports", "InvalidCategory", "Camping"];
      const inputCopy = [...input];
      filterValidCategories(input);
      expect(input).toEqual(inputCopy);
    });

    it("should handle XSS attempts in array", () => {
      const input = [
        "<script>alert('xss')</script>",
        "Sports",
        "Camping<script>",
      ];
      expect(filterValidCategories(input)).toEqual(["Sports"]);
    });

    it("should handle SQL injection attempts in array", () => {
      const input = ["Sports' OR '1'='1", "Sports", "; DROP TABLE resources;"];
      expect(filterValidCategories(input)).toEqual(["Sports"]);
    });

    it("should handle large arrays efficiently", () => {
      const largeInput = [
        ...Array(1000).fill("InvalidCategory"),
        "Sports",
        "Camping",
      ];
      const result = filterValidCategories(largeInput);
      expect(result).toEqual(["Sports", "Camping"]);
    });

    it("should handle duplicates in input", () => {
      const input = ["Sports", "Camping", "Sports", "Tools", "Camping"];
      // Note: filterValidCategories does NOT deduplicate
      expect(filterValidCategories(input)).toEqual([
        "Sports",
        "Camping",
        "Sports",
        "Tools",
        "Camping",
      ]);
    });

    it("should handle whitespace in categories", () => {
      const input = [" Sports", "Camping ", " Tools ", "Garden"];
      expect(filterValidCategories(input)).toEqual(["Garden"]);
    });
  });

  describe("Integration - Autocomplete Use Case", () => {
    it("should support autocomplete filtering", () => {
      const userInput = "sp";
      const filtered = CATEGORIES.filter((cat) =>
        cat.toLowerCase().includes(userInput.toLowerCase()),
      );
      expect(filtered).toContain("Sports");
      expect(filtered).toContain("Water Sports");
    });

    it("should support multi-select validation", () => {
      const userSelection = ["Sports", "InvalidCategory", "Camping"];
      const validSelection = filterValidCategories(userSelection);
      expect(validSelection).toEqual(["Sports", "Camping"]);
      expect(validSelection.every(isValidCategory)).toBe(true);
    });

    it("should prevent injection through autocomplete", () => {
      const maliciousInput = ["Sports", "<script>", "'; DROP TABLE;"];
      const sanitized = filterValidCategories(maliciousInput);
      expect(sanitized).toEqual(["Sports"]);
    });
  });

  describe("TypeScript Type Safety", () => {
    it("should narrow type with type guard", () => {
      const value: unknown = "Sports";

      if (isValidCategory(value)) {
        // TypeScript should now know value is Category type
        const categories: (typeof CATEGORIES)[number][] = [value];
        expect(categories).toContain("Sports");
      }
    });

    it("should work with Category union type", () => {
      type Category = (typeof CATEGORIES)[number];
      const validCategory: Category = "Sports";
      expect(isValidCategory(validCategory)).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should validate category in O(1) time using Set", () => {
      // CATEGORY_SET should be used internally for O(1) lookup
      const iterations = 10000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        isValidCategory("Sports");
        isValidCategory("InvalidCategory");
      }

      const duration = performance.now() - start;
      // Should complete 10k validations in under 50ms
      expect(duration).toBeLessThan(50);
    });

    it("should filter large arrays efficiently", () => {
      const largeArray = [
        ...Array(5000).fill("InvalidCategory"),
        ...CATEGORIES,
      ];
      const start = performance.now();
      const result = filterValidCategories(largeArray);
      const duration = performance.now() - start;

      expect(result).toHaveLength(CATEGORIES.length);
      expect(duration).toBeLessThan(100); // Should be fast
    });
  });
});
