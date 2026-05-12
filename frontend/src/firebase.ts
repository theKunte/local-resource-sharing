// Firebase config and initialization with runtime configuration support
import { initializeApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  Auth,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";
import { logError } from "./utils/errorHandler";
import { loadRuntimeConfig } from "./config/runtimeConfig";
import { configureApiClient } from "./utils/apiClient";

// Firebase will be initialized asynchronously after runtime config loads
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firebaseInitError: string | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize Firebase with runtime configuration
 * This loads config from config.js (production) or .env (development)
 */
export async function initializeFirebase(): Promise<void> {
  // Return existing initialization promise if already in progress
  if (initPromise) {
    return initPromise;
  }

  // Already initialized successfully
  if (app) {
    return;
  }

  initPromise = (async () => {
    try {
      // Load runtime configuration
      const config = await loadRuntimeConfig();

      // Configure API client with runtime API URL
      configureApiClient(config.API_URL);

      const firebaseConfig = {
        apiKey: config.FIREBASE_API_KEY,
        authDomain: config.FIREBASE_AUTH_DOMAIN,
        projectId: config.FIREBASE_PROJECT_ID,
        storageBucket: config.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: config.FIREBASE_MESSAGING_SENDER_ID,
        appId: config.FIREBASE_APP_ID,
        measurementId: config.FIREBASE_MEASUREMENT_ID,
      };

      // Check if Firebase config is present
      if (!firebaseConfig.apiKey) {
        firebaseInitError =
          "Firebase configuration missing! Check your environment variables.";
        logError("Firebase Config", firebaseInitError);
        return;
      }

      // Initialize Firebase
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);

      console.log("Firebase initialized successfully");
    } catch (error) {
      firebaseInitError = `Failed to initialize Firebase: ${error}`;
      logError("Firebase Init", firebaseInitError);
    }
  })();

  return initPromise;
}

/**
 * Get Firebase app instance (must call initializeFirebase first)
 */
export function getFirebaseApp(): FirebaseApp | null {
  return app;
}

/**
 * Get Firebase auth instance (must call initializeFirebase first)
 */
export function getFirebaseAuth(): Auth | null {
  return auth;
}

// Export error state
export { firebaseInitError };

// Legacy exports for backward compatibility - these will be null until initialized
export { app, auth };

// Lazy-initialized Firebase Cloud Messaging (only in supported browsers)
let _messaging: ReturnType<typeof getMessaging> | null = null;
let _messagingChecked = false;

export async function getFirebaseMessaging() {
  if (_messagingChecked) return _messaging;
  _messagingChecked = true;
  if (!app) return null; // Can't initialize messaging without app
  try {
    const supported = await isSupported();
    if (supported) {
      _messaging = getMessaging(app);
    }
  } catch {
    // FCM not supported in this environment
  }
  return _messaging;
}

// Track persistence initialization status
let persistenceInitialized = false;
let persistenceError: Error | null = null;

// Set session-only persistence (clears on browser close)
if (auth) {
  setPersistence(auth, browserSessionPersistence)
    .then(() => {
      persistenceInitialized = true;
      if (import.meta.env.DEV) {
        console.log("✅ Firebase auth persistence set to session-only");
      }
    })
    .catch((error) => {
      persistenceError = error;
      logError("Firebase Auth Persistence", error);

      // Sign out user for security
      auth?.signOut().catch((signOutError) => {
        logError("Firebase Sign Out", signOutError);
      });

      // Store error state for the app to handle
      sessionStorage.setItem(
        "firebase_init_error",
        "Authentication system initialization failed. Please refresh the page.",
      );
    });
}

// Export helper to check persistence status
export function checkFirebasePersistence(): {
  initialized: boolean;
  error: Error | null;
} {
  return {
    initialized: persistenceInitialized,
    error: persistenceError,
  };
}
