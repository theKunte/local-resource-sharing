/**
 * Shared category definitions for resource classification
 *
 * IMPORTANT: Keep this synchronized with frontend/src/constants/categories.ts
 * Any changes here should be reflected in the frontend as well.
 */

export const CATEGORIES = [
  "Shelter & Sleep Systems",
  "Packs & Bags",
  "Camp Kitchen",
  "Apparel",
  "Backpacking & Hiking",
  "Snow Sports",
  "Water Sports",
  "Climbing & Mountaineering",
  "Navigation & Safety",
  "Light",
  "Other",
  "Cycling",
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * Set of valid categories for O(1) lookup
 */
export const CATEGORY_SET = new Set<string>(CATEGORIES);

/**
 * Validates if a string is a valid category
 */
export function isValidCategory(value: unknown): value is Category {
  return typeof value === "string" && CATEGORY_SET.has(value);
}

/**
 * Filters and normalizes an array to only include valid, unique categories
 * - Removes duplicates
 * - Validates against whitelist
 * - Trims whitespace
 * - Limits to maxCount
 */
export function sanitizeCategories(
  values: unknown,
  maxCount: number = 5,
): string[] {
  if (!Array.isArray(values) && typeof values !== "string") {
    return [];
  }

  const items = Array.isArray(values) ? values : [values];

  // Remove duplicates using Set, validate, and limit
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    if (typeof item !== "string") continue;

    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;

    if (isValidCategory(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);

      if (result.length >= maxCount) break;
    }
  }

  return result;
}
