/**
 * Runtime Configuration Loader
 *
 * Loads configuration from a dynamically generated config.js file
 * instead of baking credentials into the Docker image at build time.
 *
 * This allows:
 * - Credential rotation without rebuilding images
 * - Same image deployed to multiple environments
 * - Secrets never baked into image layers
 */

interface RuntimeConfig {
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
  FIREBASE_APP_ID: string;
  FIREBASE_MEASUREMENT_ID: string;
  API_URL: string;
}

declare global {
  interface Window {
    RUNTIME_CONFIG?: RuntimeConfig;
  }
}

let configLoaded = false;
let configPromise: Promise<RuntimeConfig> | null = null;

/**
 * Load runtime configuration from config.js
 * In development, falls back to Vite environment variables
 */
export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  // Return cached promise if already loading
  if (configPromise) {
    return configPromise;
  }

  // Return immediately if already loaded
  if (configLoaded && window.RUNTIME_CONFIG) {
    return window.RUNTIME_CONFIG;
  }

  configPromise = (async () => {
    // In production (Docker), load from config.js
    if (import.meta.env.PROD) {
      try {
        // Fetch and execute the runtime config.js file
        const response = await fetch("/config.js");
        const scriptContent = await response.text();
        // Execute the script to populate window.RUNTIME_CONFIG
        // eslint-disable-next-line no-eval
        eval(scriptContent);

        if (window.RUNTIME_CONFIG) {
          configLoaded = true;
          return window.RUNTIME_CONFIG;
        }
      } catch (error) {
        console.error("Failed to load runtime config:", error);
      }
    }

    // Fallback to build-time env vars (development mode)
    const fallbackConfig: RuntimeConfig = {
      FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY || "",
      FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
      FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
      FIREBASE_STORAGE_BUCKET:
        import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
      FIREBASE_MESSAGING_SENDER_ID:
        import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
      FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID || "",
      FIREBASE_MEASUREMENT_ID:
        import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
      API_URL: import.meta.env.VITE_API_URL || "",
    };

    configLoaded = true;
    window.RUNTIME_CONFIG = fallbackConfig;
    return fallbackConfig;
  })();

  return configPromise;
}

/**
 * Get the current runtime config (must be loaded first)
 */
export function getRuntimeConfig(): RuntimeConfig {
  if (!window.RUNTIME_CONFIG) {
    throw new Error(
      "Runtime config not loaded. Call loadRuntimeConfig() first.",
    );
  }
  return window.RUNTIME_CONFIG;
}
