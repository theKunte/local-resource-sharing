// Firebase config and initialization
import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";
import { logError } from "./utils/errorHandler";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Check if Firebase config is present
if (!firebaseConfig.apiKey) {
  const errorMessage = "Firebase configuration missing! Check your .env file.";
  logError("Firebase Config", errorMessage);
  throw new Error(errorMessage);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Lazy-initialized Firebase Cloud Messaging (only in supported browsers)
let _messaging: ReturnType<typeof getMessaging> | null = null;
let _messagingChecked = false;

export async function getFirebaseMessaging() {
  if (_messagingChecked) return _messaging;
  _messagingChecked = true;
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
    auth.signOut().catch((signOutError) => {
      logError("Firebase Sign Out", signOutError);
    });
    
    // Store error state for the app to handle
    sessionStorage.setItem(
      "firebase_init_error",
      "Authentication system initialization failed. Please refresh the page."
    );
  });

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
