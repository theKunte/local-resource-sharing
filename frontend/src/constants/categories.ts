/**
 * Shared category definitions for resource classification
 *
 * IMPORTANT: Keep this synchronized with backend/src/constants/categories.ts
 * Any changes here should be reflected in the backend as well.
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
 * Validates if a string is a valid category
 */
export function isValidCategory(value: unknown): value is Category {
  return typeof value === "string" && CATEGORIES.includes(value as Category);
}

/**
 * Filters an array to only include valid categories
 */
export function filterValidCategories(values: unknown[]): Category[] {
  return values.filter(isValidCategory);
}

/**
 * Set of valid categories for O(1) lookup
 */
export const CATEGORY_SET = new Set<string>(CATEGORIES);
