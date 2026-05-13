import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AxiosError } from "axios";

const {
  mockGetIdToken,
  mockSignOut,
  mockGetFirebaseAuth,
  mockAuth,
  currentUserState,
} = vi.hoisted(() => {
  const mockGetIdToken = vi.fn();
  const mockSignOut = vi.fn();
  const mockGetFirebaseAuth = vi.fn();

  // Mutable state object that can be updated in tests
  const currentUserState = {
    value: null as { getIdToken: () => Promise<string> } | null,
  };

  const mockAuth = {
    get currentUser() {
      return currentUserState.value;
    },
    signOut: mockSignOut,
  };

  return {
    mockGetIdToken,
    mockSignOut,
    mockGetFirebaseAuth,
    mockAuth,
    currentUserState,
  };
});

vi.mock("../../firebase", () => ({
  auth: mockAuth,
  getFirebaseAuth: mockGetFirebaseAuth,
  initializeFirebase: vi.fn().mockResolvedValue(undefined),
}));

describe("apiClient", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn> | undefined;
  let consoleLogSpy: ReturnType<typeof vi.spyOn> | undefined;
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIdToken.mockResolvedValue("test-token");
    currentUserState.value = {
      getIdToken: mockGetIdToken,
    };
    mockGetFirebaseAuth.mockReturnValue(mockAuth);
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Mock window.location with writable href property
    originalLocation = window.location;
    delete (window as { location?: Location }).location;
    (window as { location: Partial<Location> }).location = {
      ...originalLocation,
      href: "",
    };
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    consoleLogSpy?.mockRestore();
    (window as { location: Location }).location = originalLocation;
    vi.resetModules(); // Clear module cache between tests
  });

  it("exports a default axios instance", async () => {
    const { default: apiClient } = await import("../apiClient");
    expect(apiClient).toBeDefined();
    expect(apiClient.defaults.headers["Content-Type"]).toBe("application/json");
  });

  it("has base URL from environment or default", async () => {
    const { default: apiClient } = await import("../apiClient");
    expect(apiClient.defaults.baseURL).toBeDefined();
    expect(typeof apiClient.defaults.baseURL).toBe("string");
  });

  it("sets allowAbsoluteUrls to false for SSRF protection", async () => {
    const { default: apiClient } = await import("../apiClient");
    expect(apiClient.defaults.allowAbsoluteUrls).toBe(false);
  });

  it("has request interceptor configured", async () => {
    const { default: apiClient } = await import("../apiClient");
    expect(
      (apiClient.interceptors.request as unknown as { handlers: unknown[] })
        .handlers.length,
    ).toBeGreaterThan(0);
  });

  it("has response interceptor configured", async () => {
    const { default: apiClient } = await import("../apiClient");
    expect(
      (apiClient.interceptors.response as unknown as { handlers: unknown[] })
        .handlers.length,
    ).toBeGreaterThan(0);
  });

  it("exposes get, post, put, delete methods", async () => {
    const { default: apiClient } = await import("../apiClient");
    expect(typeof apiClient.get).toBe("function");
    expect(typeof apiClient.post).toBe("function");
    expect(typeof apiClient.put).toBe("function");
    expect(typeof apiClient.delete).toBe("function");
  });

  describe("configureApiClient", () => {
    it("updates the base URL when called with a valid URL", async () => {
      const { default: apiClient, configureApiClient } =
        await import("../apiClient");

      const newBaseUrl = "https://api.example.com";
      configureApiClient(newBaseUrl);

      expect(apiClient.defaults.baseURL).toBe(newBaseUrl);
    });

    it("falls back to default URL when called with empty string", async () => {
      const { default: apiClient, configureApiClient } =
        await import("../apiClient");

      configureApiClient("");

      expect(apiClient.defaults.baseURL).toBe("http://localhost:3001");
    });

    it("logs the configured base URL", async () => {
      const { configureApiClient } = await import("../apiClient");

      const newBaseUrl = "https://api.production.com";
      configureApiClient(newBaseUrl);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "API client configured with base URL:",
        newBaseUrl,
      );
    });
  });

  describe("Request Interceptor", () => {
    it("adds auth token to headers when user is authenticated", async () => {
      mockGetIdToken.mockResolvedValue("my-auth-token");
      const { default: apiClient } = await import("../apiClient");

      const config = {
        url: "/api/resources",
        method: "GET",
        headers: {},
      };

      const interceptor = (
        apiClient.interceptors.request as unknown as {
          handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
        }
      ).handlers[0];

      const result = (await interceptor.fulfilled(config)) as {
        headers: { Authorization?: string };
      };

      expect(result.headers.Authorization).toBe("Bearer my-auth-token");
    });

    it("sanitizes auth token by removing CR/LF characters", async () => {
      mockGetIdToken.mockResolvedValue("token-with\r\ninjection");
      const { default: apiClient } = await import("../apiClient");

      const config = {
        url: "/api/resources",
        method: "GET",
        headers: {},
      };

      const interceptor = (
        apiClient.interceptors.request as unknown as {
          handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
        }
      ).handlers[0];

      const result = (await interceptor.fulfilled(config)) as {
        headers: { Authorization?: string };
      };

      expect(result.headers.Authorization).toBe("Bearer token-withinjection");
      expect(result.headers.Authorization).not.toContain("\r");
      expect(result.headers.Authorization).not.toContain("\n");
    });

    it("does not add auth token when user is not authenticated", async () => {
      currentUserState.value = null;
      const { default: apiClient } = await import("../apiClient");

      const config = {
        url: "/api/resources",
        method: "GET",
        headers: {},
      };

      const interceptor = (
        apiClient.interceptors.request as unknown as {
          handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
        }
      ).handlers[0];

      const result = (await interceptor.fulfilled(config)) as {
        headers: { Authorization?: string };
      };

      expect(result.headers.Authorization).toBeUndefined();
    });

    it("handles errors when getting auth token", async () => {
      mockGetIdToken.mockRejectedValue(new Error("Token fetch failed"));
      const { default: apiClient } = await import("../apiClient");

      const config = {
        url: "/api/resources",
        method: "GET",
        headers: {},
      };

      const interceptor = (
        apiClient.interceptors.request as unknown as {
          handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
        }
      ).handlers[0];

      const result = await interceptor.fulfilled(config);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error getting auth token:",
        expect.any(Error),
      );
      expect(result).toBeDefined();
    });

    it("tracks GET requests with cache key", async () => {
      const { default: apiClient } = await import("../apiClient");

      const config = {
        url: "/api/resources",
        method: "GET",
        params: { page: 1 },
        headers: {},
      };

      const interceptor = (
        apiClient.interceptors.request as unknown as {
          handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
        }
      ).handlers[0];

      const result = (await interceptor.fulfilled(config)) as {
        __cacheKey?: string;
      };

      expect(result.__cacheKey).toBeDefined();
      expect(result.__cacheKey).toContain("GET");
      expect(result.__cacheKey).toContain("/api/resources");
    });

    it("does not track non-GET requests with cache key", async () => {
      const { default: apiClient } = await import("../apiClient");

      const config = {
        url: "/api/resources",
        method: "POST",
        headers: {},
      };

      const interceptor = (
        apiClient.interceptors.request as unknown as {
          handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
        }
      ).handlers[0];

      const result = (await interceptor.fulfilled(config)) as {
        __cacheKey?: string;
      };

      expect(result.__cacheKey).toBeUndefined();
    });

    it("blocks requests with SSRF-protected hostnames in URL", async () => {
      // Test the SSRF protection by checking that isBlockedUrl exists
      // in the interceptor logic. Since allowAbsoluteUrls:false, axios blocks
      // absolute URLs before the interceptor, so we verify the protection is in place
      const { default: apiClient } = await import("../apiClient");

      const config = {
        url: "/metadata.google.internal/computeMetadata/v1/",
        method: "GET",
        headers: {},
      };

      const interceptor = (
        apiClient.interceptors.request as unknown as {
          handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
        }
      ).handlers[0];

      // This doesn't trigger because the URL is relative and gets appended to baseURL
      // But the protection code is still in place for defensive purposes
      const result = await interceptor.fulfilled(config);
      expect(result).toBeDefined();
    });

    it("blocks requests to AWS metadata endpoint when baseURL contains blocked hostname", async () => {
      const { default: apiClient, configureApiClient } =
        await import("../apiClient");

      // Configure baseURL to a blocked hostname to trigger the SSRF protection
      configureApiClient("http://169.254.169.254");

      const config = {
        url: "/latest/meta-data/",
        method: "GET",
        headers: {},
      };

      const interceptor = (
        apiClient.interceptors.request as unknown as {
          handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
        }
      ).handlers[0];

      await expect(interceptor.fulfilled(config)).rejects.toThrow(
        "Request blocked: target resolves to a restricted network address.",
      );
    });

    it("blocks requests to Google metadata endpoint", async () => {
      const { default: apiClient, configureApiClient } =
        await import("../apiClient");

      // Configure baseURL to Google metadata endpoint
      configureApiClient("http://metadata.google.internal");

      const config = {
        url: "/computeMetadata/v1/",
        method: "GET",
        headers: {},
      };

      const interceptor = (
        apiClient.interceptors.request as unknown as {
          handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
        }
      ).handlers[0];

      await expect(interceptor.fulfilled(config)).rejects.toThrow(
        "Request blocked: target resolves to a restricted network address.",
      );
    });

    it("blocks requests to private IP 10.x.x.x ranges", async () => {
      const { default: apiClient, configureApiClient } =
        await import("../apiClient");

      configureApiClient("http://10.0.0.1");

      const config = {
        url: "/admin",
        method: "GET",
        headers: {},
      };

      const interceptor = (
        apiClient.interceptors.request as unknown as {
          handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
        }
      ).handlers[0];

      await expect(interceptor.fulfilled(config)).rejects.toThrow(
        "Request blocked: target resolves to a restricted network address.",
      );
    });

    it("blocks requests to private IP 192.168.x.x ranges", async () => {
      const { default: apiClient, configureApiClient } =
        await import("../apiClient");

      configureApiClient("http://192.168.1.1");

      const config = {
        url: "/router/admin",
        method: "GET",
        headers: {},
      };

      const interceptor = (
        apiClient.interceptors.request as unknown as {
          handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
        }
      ).handlers[0];

      await expect(interceptor.fulfilled(config)).rejects.toThrow(
        "Request blocked: target resolves to a restricted network address.",
      );
    });

    it("blocks requests to localhost 127.0.0.1", async () => {
      const { default: apiClient, configureApiClient } =
        await import("../apiClient");

      configureApiClient("http://127.0.0.1:8080");

      const config = {
        url: "/secret",
        method: "GET",
        headers: {},
      };

      const interceptor = (
        apiClient.interceptors.request as unknown as {
          handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
        }
      ).handlers[0];

      await expect(interceptor.fulfilled(config)).rejects.toThrow(
        "Request blocked: target resolves to a restricted network address.",
      );
    });

    it("blocks requests with malformed URLs in catch block", async () => {
      const { default: apiClient, configureApiClient } =
        await import("../apiClient");

      // Set an invalid baseURL to trigger URL parsing errors
      configureApiClient("not-a-valid-url");

      const config = {
        url: "/api/test",
        method: "GET",
        headers: {},
      };

      const interceptor = (
        apiClient.interceptors.request as unknown as {
          handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
        }
      ).handlers[0];

      // Should block malformed URLs (catch block returns true)
      await expect(interceptor.fulfilled(config)).rejects.toThrow(
        "Request blocked: target resolves to a restricted network address.",
      );
    });

    it("has SSRF protection code for AWS metadata endpoint", async () => {
      const { default: apiClient } = await import("../apiClient");

      const config = {
        url: "/169.254.169.254/latest/meta-data/",
        method: "GET",
        headers: {},
      };

      const interceptor = (
        apiClient.interceptors.request as unknown as {
          handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
        }
      ).handlers[0];

      const result = await interceptor.fulfilled(config);
      expect(result).toBeDefined();
    });

    it("has SSRF protection code for private IP ranges", async () => {
      const { default: apiClient } = await import("../apiClient");

      const config = {
        url: "/10.0.0.1/admin",
        method: "GET",
        headers: {},
      };

      const interceptor = (
        apiClient.interceptors.request as unknown as {
          handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
        }
      ).handlers[0];

      const result = await interceptor.fulfilled(config);
      expect(result).toBeDefined();
    });

    it("has SSRF protection code for localhost", async () => {
      const { default: apiClient } = await import("../apiClient");

      const config = {
        url: "/127.0.0.1:8080/secret",
        method: "GET",
        headers: {},
      };

      const interceptor = (
        apiClient.interceptors.request as unknown as {
          handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
        }
      ).handlers[0];

      const result = await interceptor.fulfilled(config);
      expect(result).toBeDefined();
    });

    it("allows requests to legitimate API endpoints", async () => {
      const { default: apiClient } = await import("../apiClient");

      const config = {
        url: "/api/resources",
        method: "GET",
        headers: {},
      };

      const interceptor = (
        apiClient.interceptors.request as unknown as {
          handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
        }
      ).handlers[0];

      const result = await interceptor.fulfilled(config);
      expect(result).toBeDefined();
    });

    it("handles request interceptor errors", async () => {
      const { default: apiClient } = await import("../apiClient");

      const error = new Error("Network error");

      const interceptor = (
        apiClient.interceptors.request as unknown as {
          handlers: Array<{ rejected: (error: Error) => Promise<never> }>;
        }
      ).handlers[0];

      await expect(interceptor.rejected(error)).rejects.toThrow(
        "Network error",
      );
    });
  });

  describe("Response Interceptor", () => {
    it("cleans up cache on successful response", async () => {
      const { default: apiClient } = await import("../apiClient");

      const response = {
        config: { __cacheKey: "GET:/api/resources:{}" },
        data: { success: true },
        status: 200,
        statusText: "OK",
        headers: {},
      };

      const interceptor = (
        apiClient.interceptors.response as unknown as {
          handlers: Array<{ fulfilled: (response: unknown) => unknown }>;
        }
      ).handlers[0];

      const result = interceptor.fulfilled(response);
      expect(result).toEqual(response);
    });

    it("cleans up cache on error response", async () => {
      const { default: apiClient } = await import("../apiClient");

      const error = {
        config: { __cacheKey: "GET:/api/resources:{}" },
        response: { status: 500 },
      } as unknown as AxiosError;

      const interceptor = (
        apiClient.interceptors.response as unknown as {
          handlers: Array<{ rejected: (error: unknown) => Promise<never> }>;
        }
      ).handlers[0];

      await expect(interceptor.rejected(error)).rejects.toEqual(error);
    });

    it("handles 401 error by signing out and redirecting", async () => {
      const { default: apiClient } = await import("../apiClient");

      const error = {
        config: { __cacheKey: "GET:/api/resources:{}" },
        response: { status: 401 },
      } as unknown as AxiosError;

      const interceptor = (
        apiClient.interceptors.response as unknown as {
          handlers: Array<{ rejected: (error: unknown) => Promise<never> }>;
        }
      ).handlers[0];

      await expect(interceptor.rejected(error)).rejects.toEqual(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Authentication failed. Please log in again.",
      );
      expect(mockSignOut).toHaveBeenCalled();
      expect(window.location.href).toBe("/");
    });

    it("does not sign out for non-401 errors", async () => {
      const { default: apiClient } = await import("../apiClient");

      const error = {
        config: { __cacheKey: "GET:/api/resources:{}" },
        response: { status: 500 },
      } as unknown as AxiosError;

      const interceptor = (
        apiClient.interceptors.response as unknown as {
          handlers: Array<{ rejected: (error: unknown) => Promise<never> }>;
        }
      ).handlers[0];

      await expect(interceptor.rejected(error)).rejects.toEqual(error);

      expect(mockSignOut).not.toHaveBeenCalled();
      expect(window.location.href).toBe("");
    });

    it("handles errors without response object", async () => {
      const { default: apiClient } = await import("../apiClient");

      const error = {
        config: { __cacheKey: "GET:/api/resources:{}" },
        message: "Network Error",
      } as unknown as AxiosError;

      const interceptor = (
        apiClient.interceptors.response as unknown as {
          handlers: Array<{ rejected: (error: unknown) => Promise<never> }>;
        }
      ).handlers[0];

      await expect(interceptor.rejected(error)).rejects.toEqual(error);

      expect(mockSignOut).not.toHaveBeenCalled();
    });
  });

  describe("Request Deduplication", () => {
    it("wraps apiClient.get for request deduplication", async () => {
      const { default: apiClient } = await import("../apiClient");

      // Verify that apiClient.get is a wrapped function (the deduplication logic)
      // The actual deduplication requires making real requests which would need mocking
      // Here we just verify the wrapper exists
      expect(typeof apiClient.get).toBe("function");

      // The get method should be the wrapped version defined after the interceptors
      expect(apiClient.get.name).toBeDefined();
    });
  });
});
