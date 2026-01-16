/**
 * Error handling utilities
 */
import type { ApiErrorResponse } from "../types/api.types";

/**
 * Extract user-friendly error message from API error response
 */
export function getErrorMessage(error: unknown): string {
  if (!error) {
    return "An unexpected error occurred";
  }

  const apiError = error as ApiErrorResponse;

  // Check for backend error message
  if (apiError.response?.data?.message) {
    return apiError.response.data.message;
  }

  if (apiError.response?.data?.error) {
    return apiError.response.data.error;
  }

  // Check for axios error message
  if (apiError.message) {
    return apiError.message;
  }

  // Default error
  return "An unexpected error occurred";
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  const apiError = error as ApiErrorResponse;
  return apiError.response?.status === 401 || apiError.response?.status === 403;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  const apiError = error as ApiErrorResponse;
  return !apiError.response && !!apiError.message;
}

/**
 * Log error to console in development mode only
 */
export function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  }
}
