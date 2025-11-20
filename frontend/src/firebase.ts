// Firebase config and initialization
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

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
  console.error(
    "❌ Firebase configuration missing! Please create a .env file in the frontend directory with:"
  );
  console.error("VITE_FIREBASE_API_KEY=your_api_key");
  console.error("VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain");
  console.error("VITE_FIREBASE_PROJECT_ID=your_project_id");
  console.error("VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket");
  console.error("VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id");
  console.error("VITE_FIREBASE_APP_ID=your_app_id");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
