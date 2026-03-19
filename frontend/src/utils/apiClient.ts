/**
 * Authenticated Axios Instance
 * Automatically includes Firebase auth token in all requests
 * With request deduplication and caching
 */
import axios from "axios";
import { auth } from "../firebase";

// Get backend URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request deduplication cache
const pendingRequests = new Map<string, Promise<any>>();

// Generate cache key for GET requests
const getCacheKey = (config: any): string => {
  const { method, url, params } = config;
  return `${method}:${url}:${JSON.stringify(params || {})}`;
};

// Request interceptor: Add auth token and track GET requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;

      if (user) {
        // Get fresh ID token from Firebase
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Track GET requests for deduplication
      if (config.method?.toUpperCase() === "GET") {
        const cacheKey = getCacheKey(config);
        (config as any).__cacheKey = cacheKey;
      }
    } catch (error) {
      console.error("Error getting auth token:", error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor: Handle auth errors and manage deduplication cache
apiClient.interceptors.response.use(
  (response) => {
    // Clean up pending request cache for GET requests
    const cacheKey = (response.config as any).__cacheKey;
    if (cacheKey) {
      pendingRequests.delete(cacheKey);
    }
    return response;
  },
  async (error) => {
    // Clean up pending request cache on error
    const cacheKey = (error.config as any)?.__cacheKey;
    if (cacheKey) {
      pendingRequests.delete(cacheKey);
    }

    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to landing page
      console.error("Authentication failed. Please log in again.");
      // Sign out user and redirect to home (which shows Landing page)
      auth.signOut();
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

// Wrap the get method to implement deduplication
const originalGet = apiClient.get.bind(apiClient);
apiClient.get = function <T = any>(url: string, config?: any): Promise<any> {
  const cacheKey = getCacheKey({ method: "GET", url, params: config?.params });

  // Return existing pending request if available
  if (pendingRequests.has(cacheKey)) {
    console.log("[API Dedup] Returning pending GET request:", cacheKey);
    return pendingRequests.get(cacheKey)!;
  }

  // Create new request and cache it
  const requestPromise = originalGet(url, config);
  pendingRequests.set(cacheKey, requestPromise);

  // Clean up on completion (both success and error handled by interceptors)
  return requestPromise;
};

export default apiClient;
