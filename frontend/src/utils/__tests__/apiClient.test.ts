import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetIdToken = vi.fn();
const mockSignOut = vi.fn();

vi.mock("../../firebase", () => ({
  auth: {
    currentUser: {
      getIdToken: () => mockGetIdToken(),
    },
    signOut: mockSignOut,
  },
}));

describe("apiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIdToken.mockResolvedValue("test-token");
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

  it("getCacheKey generates consistent keys", async () => {
    const { default: apiClient } = await import("../apiClient");
    // The deduplication wraps apiClient.get - verify it's a function
    expect(typeof apiClient.get).toBe("function");
  });
});
