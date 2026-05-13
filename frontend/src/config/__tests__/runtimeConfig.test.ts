/**
 * Tests for Runtime Configuration Loader
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock fetch globally
globalThis.fetch = vi.fn();

// Helper to reset module state between tests
async function resetRuntimeConfig() {
  // Clear window.RUNTIME_CONFIG
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).RUNTIME_CONFIG;

  // Re-import the module to reset its internal state
  vi.resetModules();
}

describe("runtimeConfig", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await resetRuntimeConfig();
  });

  describe("loadRuntimeConfig - Production Mode", () => {
    beforeEach(() => {
      // Mock production environment
      vi.stubEnv("PROD", true);
    });

    it("should load config from /config.js in production", async () => {
      const mockConfig = {
        FIREBASE_API_KEY: "prod-api-key",
        FIREBASE_AUTH_DOMAIN: "prod-auth.firebaseapp.com",
        FIREBASE_PROJECT_ID: "prod-project",
        FIREBASE_STORAGE_BUCKET: "prod-bucket",
        FIREBASE_MESSAGING_SENDER_ID: "prod-sender-id",
        FIREBASE_APP_ID: "prod-app-id",
        FIREBASE_MEASUREMENT_ID: "prod-measurement-id",
        API_URL: "https://api.example.com",
      };

      // Mock successful fetch
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        text: async () =>
          `window.RUNTIME_CONFIG = ${JSON.stringify(mockConfig)};`,
      } as Response);

      const { loadRuntimeConfig } = await import("../runtimeConfig");
      const config = await loadRuntimeConfig();

      expect(globalThis.fetch).toHaveBeenCalledWith("/config.js");
      expect(config).toEqual(mockConfig);
      expect(window.RUNTIME_CONFIG).toEqual(mockConfig);
    });

    it("should handle fetch errors and fall back to env vars", async () => {
      // Mock fetch failure
      vi.mocked(globalThis.fetch).mockRejectedValueOnce(
        new Error("Network error"),
      );

      // Mock environment variables
      vi.stubEnv("VITE_FIREBASE_API_KEY", "dev-api-key");
      vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "dev-auth.firebaseapp.com");
      vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "dev-project");
      vi.stubEnv("VITE_FIREBASE_STORAGE_BUCKET", "dev-bucket");
      vi.stubEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "dev-sender-id");
      vi.stubEnv("VITE_FIREBASE_APP_ID", "dev-app-id");
      vi.stubEnv("VITE_FIREBASE_MEASUREMENT_ID", "dev-measurement-id");
      vi.stubEnv("VITE_API_URL", "http://localhost:3001");

      const { loadRuntimeConfig } = await import("../runtimeConfig");
      const config = await loadRuntimeConfig();

      expect(config.FIREBASE_API_KEY).toBe("dev-api-key");
      expect(config.API_URL).toBe("http://localhost:3001");
    });

    it("should return cached promise on concurrent calls", async () => {
      const mockConfig = {
        FIREBASE_API_KEY: "test-key",
        FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
        FIREBASE_PROJECT_ID: "test-project",
        FIREBASE_STORAGE_BUCKET: "test-bucket",
        FIREBASE_MESSAGING_SENDER_ID: "test-sender",
        FIREBASE_APP_ID: "test-app",
        FIREBASE_MEASUREMENT_ID: "test-measurement",
        API_URL: "http://test.com",
      };

      // Mock fetch with delay to test concurrent behavior
      vi.mocked(globalThis.fetch).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  text: async () =>
                    `window.RUNTIME_CONFIG = ${JSON.stringify(mockConfig)};`,
                } as Response),
              50,
            ),
          ),
      );

      const { loadRuntimeConfig } = await import("../runtimeConfig");

      // Call multiple times concurrently
      const [config1, config2, config3] = await Promise.all([
        loadRuntimeConfig(),
        loadRuntimeConfig(),
        loadRuntimeConfig(),
      ]);

      // Should only fetch once
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(config1).toEqual(mockConfig);
      expect(config2).toEqual(mockConfig);
      expect(config3).toEqual(mockConfig);
    });

    it("should return immediately if already loaded", async () => {
      const mockConfig = {
        FIREBASE_API_KEY: "cached-key",
        FIREBASE_AUTH_DOMAIN: "cached.firebaseapp.com",
        FIREBASE_PROJECT_ID: "cached-project",
        FIREBASE_STORAGE_BUCKET: "cached-bucket",
        FIREBASE_MESSAGING_SENDER_ID: "cached-sender",
        FIREBASE_APP_ID: "cached-app",
        FIREBASE_MEASUREMENT_ID: "cached-measurement",
        API_URL: "http://cached.com",
      };

      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        text: async () =>
          `window.RUNTIME_CONFIG = ${JSON.stringify(mockConfig)};`,
      } as Response);

      const { loadRuntimeConfig } = await import("../runtimeConfig");

      // First call loads from fetch
      await loadRuntimeConfig();
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      // Second call should return cached without fetching
      const config2 = await loadRuntimeConfig();
      expect(globalThis.fetch).toHaveBeenCalledTimes(1); // Still only 1 call
      expect(config2).toEqual(mockConfig);
    });
  });

  describe("loadRuntimeConfig - Development Mode", () => {
    beforeEach(() => {
      // Mock development environment
      vi.stubEnv("PROD", false);
      vi.stubEnv("DEV", true);
    });

    it("should load config from environment variables in dev mode", async () => {
      vi.stubEnv("VITE_FIREBASE_API_KEY", "dev-key");
      vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "dev.firebaseapp.com");
      vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "dev-project");
      vi.stubEnv("VITE_FIREBASE_STORAGE_BUCKET", "dev-bucket");
      vi.stubEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "dev-sender");
      vi.stubEnv("VITE_FIREBASE_APP_ID", "dev-app");
      vi.stubEnv("VITE_FIREBASE_MEASUREMENT_ID", "dev-measurement");
      vi.stubEnv("VITE_API_URL", "http://localhost:3001");

      const { loadRuntimeConfig } = await import("../runtimeConfig");
      const config = await loadRuntimeConfig();

      expect(config).toEqual({
        FIREBASE_API_KEY: "dev-key",
        FIREBASE_AUTH_DOMAIN: "dev.firebaseapp.com",
        FIREBASE_PROJECT_ID: "dev-project",
        FIREBASE_STORAGE_BUCKET: "dev-bucket",
        FIREBASE_MESSAGING_SENDER_ID: "dev-sender",
        FIREBASE_APP_ID: "dev-app",
        FIREBASE_MEASUREMENT_ID: "dev-measurement",
        API_URL: "http://localhost:3001",
      });
      expect(window.RUNTIME_CONFIG).toEqual(config);
    });

    it("should use empty strings for missing env vars", async () => {
      // Clear all Firebase env vars
      vi.stubEnv("VITE_FIREBASE_API_KEY", "");
      vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "");
      vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "");
      vi.stubEnv("VITE_FIREBASE_STORAGE_BUCKET", "");
      vi.stubEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "");
      vi.stubEnv("VITE_FIREBASE_APP_ID", "");
      vi.stubEnv("VITE_FIREBASE_MEASUREMENT_ID", "");
      vi.stubEnv("VITE_API_URL", "");

      const { loadRuntimeConfig } = await import("../runtimeConfig");
      const config = await loadRuntimeConfig();

      expect(config.FIREBASE_API_KEY).toBe("");
      expect(config.FIREBASE_AUTH_DOMAIN).toBe("");
      expect(config.API_URL).toBe("");
    });
  });

  describe("getRuntimeConfig", () => {
    beforeEach(() => {
      vi.stubEnv("PROD", false);
    });

    it("should return config when loaded", async () => {
      vi.stubEnv("VITE_FIREBASE_API_KEY", "test-key");
      vi.stubEnv("VITE_API_URL", "http://test.com");

      const { loadRuntimeConfig, getRuntimeConfig } =
        await import("../runtimeConfig");

      await loadRuntimeConfig();
      const config = getRuntimeConfig();

      expect(config.FIREBASE_API_KEY).toBe("test-key");
      expect(config.API_URL).toBe("http://test.com");
    });

    it("should throw error when config not loaded", async () => {
      const { getRuntimeConfig } = await import("../runtimeConfig");

      expect(() => getRuntimeConfig()).toThrow(
        "Runtime config not loaded. Call loadRuntimeConfig() first.",
      );
    });
  });

  describe("Edge Cases", () => {
    beforeEach(() => {
      vi.stubEnv("PROD", true);
    });

    it("should handle config.js that doesn't set window.RUNTIME_CONFIG", async () => {
      // Mock fetch returning invalid script
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        text: async () => "console.log('no config here');",
      } as Response);

      vi.stubEnv("VITE_FIREBASE_API_KEY", "fallback-key");
      vi.stubEnv("VITE_API_URL", "http://fallback.com");

      const { loadRuntimeConfig } = await import("../runtimeConfig");
      const config = await loadRuntimeConfig();

      // Should fall back to env vars
      expect(config.FIREBASE_API_KEY).toBe("fallback-key");
      expect(config.API_URL).toBe("http://fallback.com");
    });

    it("should handle malformed config.js gracefully", async () => {
      // Mock fetch returning invalid JavaScript
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        text: async () => "this is not valid javascript {{{",
      } as Response);

      vi.stubEnv("VITE_FIREBASE_API_KEY", "safe-fallback");

      const { loadRuntimeConfig } = await import("../runtimeConfig");
      const config = await loadRuntimeConfig();

      // Should fall back to env vars despite eval error
      expect(config.FIREBASE_API_KEY).toBe("safe-fallback");
    });
  });
});
