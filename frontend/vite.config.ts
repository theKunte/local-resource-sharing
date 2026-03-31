import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

/**
 * Vite plugin to inject VITE_FIREBASE_* env vars into the service worker.
 * Files in public/ are not processed by Vite, so we replace __VITE_*__
 * placeholders at dev-serve time (middleware) and build time (writeBundle).
 */
function firebaseSwEnvPlugin(): Plugin {
  const swFileName = "firebase-messaging-sw.js";
  const placeholderKeys = [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
  ];

  let envVars: Record<string, string> = {};

  function replacePlaceholders(content: string): string {
    let result = content;
    for (const key of placeholderKeys) {
      result = result.replace(
        new RegExp(`__${key}__`, "g"),
        envVars[key] || "",
      );
    }
    return result;
  }

  return {
    name: "firebase-sw-env",

    config(_cfg, { mode }) {
      envVars = loadEnv(mode, process.cwd(), "VITE_");
    },

    // Dev: intercept requests to the SW and return processed content
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === `/${swFileName}`) {
          const filePath = resolve("public", swFileName);
          const raw = readFileSync(filePath, "utf-8");
          res.setHeader("Content-Type", "application/javascript");
          res.end(replacePlaceholders(raw));
          return;
        }
        next();
      });
    },

    // Build: post-process the copied public file in the output directory
    writeBundle(options) {
      const outDir = options.dir || resolve("dist");
      const outPath = resolve(outDir, swFileName);
      try {
        const raw = readFileSync(outPath, "utf-8");
        writeFileSync(outPath, replacePlaceholders(raw), "utf-8");
      } catch {
        // SW file not in output — nothing to do
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), firebaseSwEnvPlugin()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/firebase.ts",
        "src/test/**",
      ],
    },
  },
});
