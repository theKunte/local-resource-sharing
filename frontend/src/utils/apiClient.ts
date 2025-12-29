/**
 * Authenticated Axios Instance
 * Automatically includes Firebase auth token in all requests
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

// Request interceptor: Add auth token to every request
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;

      if (user) {
        // Get fresh ID token from Firebase
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error getting auth token:", error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to landing page
      console.error("Authentication failed. Please log in again.");
      // Sign out user and redirect to home (which shows Landing page)
      auth.signOut();
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
