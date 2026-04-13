/**
 * Authenticated Axios Instance
 * Automatically includes Firebase auth token in all requests
 * With request deduplication and caching
 */
import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { auth } from "../firebase";

// Get backend URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Create axios instance with base configuration
// allowAbsoluteUrls: false prevents SSRF/cloud-metadata exfiltration (CVE-2025-27152)
// by ensuring all requests are resolved relative to baseURL only.
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  allowAbsoluteUrls: false,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---------------------------------------------------------------------------
// SSRF / NO_PROXY hostname-normalization bypass guard
// Axios does not normalize hostnames before matching against NO_PROXY, so an
// attacker can craft variants (uppercase, trailing dots, IPv6 brackets) that
// bypass proxy denylists and reach cloud-metadata or private-network services.
// This guard applies the normalization Axios omits and blocks known-bad targets.
// ---------------------------------------------------------------------------

const BLOCKED_HOSTNAMES = new Set([
  "metadata.google.internal",
  "metadata.internal",
  "169.254.169.254", // AWS / Azure / GCP link-local metadata
]);

const PRIVATE_IP_RE = [
  /^127\./, // loopback
  /^10\./, // RFC 1918
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC 1918
  /^192\.168\./, // RFC 1918
  /^169\.254\./, // link-local
  /^\[?::1\]?$/, // IPv6 loopback
  /^\[?fe80:/i, // IPv6 link-local
  /^\[?fc[0-9a-f]{2}:/i, // IPv6 ULA
];

function isBlockedUrl(relativeUrl: string | undefined, base: string): boolean {
  try {
    const resolved = new URL(relativeUrl ?? "/", base);
    // Normalize: lowercase + strip trailing dot (the bypass vector)
    const hostname = resolved.hostname.toLowerCase().replace(/\.$/, "");
    if (BLOCKED_HOSTNAMES.has(hostname)) return true;
    if (PRIVATE_IP_RE.some((re) => re.test(hostname))) return true;
    return false;
  } catch {
    return true; // block malformed / unparseable URLs
  }
}

// Request deduplication cache
const pendingRequests = new Map<string, Promise<unknown>>();

interface CacheableConfig {
  method?: string;
  url?: string;
  params?: unknown;
  __cacheKey?: string;
}

// Generate cache key for GET requests
const getCacheKey = (config: CacheableConfig): string => {
  const { method, url, params } = config;
  return `${(method || "").toUpperCase()}:${url}:${JSON.stringify(params || {})}`;
};

// Request interceptor: Add auth token and track GET requests
apiClient.interceptors.request.use(
  async (config) => {
    // Block requests that target private networks or cloud-metadata endpoints.
    // This guards against the NO_PROXY hostname normalization bypass where
    // Axios skips proxy denylists for uppercase/trailing-dot hostname variants.
    if (isBlockedUrl(config.url, API_BASE_URL)) {
      return Promise.reject(
        new Error(
          "Request blocked: target resolves to a restricted network address.",
        ),
      );
    }

    try {
      const user = auth.currentUser;

      if (user) {
        // Get fresh ID token from Firebase
        const token = await user.getIdToken();
        // Strip CR/LF to prevent HTTP header injection
        const sanitizedToken = token.replace(/[\r\n]/g, "");
        config.headers.Authorization = `Bearer ${sanitizedToken}`;
      }

      // Track GET requests for deduplication
      if (config.method?.toUpperCase() === "GET") {
        const cacheKey = getCacheKey(config as CacheableConfig);
        (config as CacheableConfig).__cacheKey = cacheKey;
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
    const cacheKey = (response.config as CacheableConfig).__cacheKey;
    if (cacheKey) {
      pendingRequests.delete(cacheKey);
    }
    return response;
  },
  async (error) => {
    // Clean up pending request cache on error
    const cacheKey = (error.config as CacheableConfig)?.__cacheKey;
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
apiClient.get = function <T = unknown, R = AxiosResponse<T>, D = unknown>(
  url: string,
  config?: AxiosRequestConfig<D>,
): Promise<R> {
  const cacheKey = getCacheKey({ method: "GET", url, params: config?.params });

  // Return existing pending request if available
  if (pendingRequests.has(cacheKey)) {
    console.log("[API Dedup] Returning pending GET request:", cacheKey);
    return pendingRequests.get(cacheKey)! as Promise<R>;
  }

  // Create new request and cache it
  const requestPromise = originalGet<T, R, D>(url, config);
  pendingRequests.set(cacheKey, requestPromise as Promise<unknown>);

  // Clean up on completion (both success and error handled by interceptors)
  return requestPromise;
};

export default apiClient;
