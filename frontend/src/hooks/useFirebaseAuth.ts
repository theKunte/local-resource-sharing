import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "../firebase";
import apiClient from "../utils/apiClient";

// Track which UIDs have already been registered this session so that
// multiple components calling useFirebaseAuth() don't each fire a
// separate /api/auth/register request on the same auth state change.
const _registeredUids = new Set<string>();

async function registerUserInBackend(firebaseUser: User) {
  if (_registeredUids.has(firebaseUser.uid)) return;
  _registeredUids.add(firebaseUser.uid);
  try {
    await apiClient.post("/api/auth/register", {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
    });
  } catch (error) {
    // Remove from set on failure so a future auth change can retry
    _registeredUids.delete(firebaseUser.uid);
    console.error("Failed to register user in backend:", error);
    // Don't fail the auth process if backend registration fails
  }
}

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      // Firebase not initialized, stay in loading state
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
          // Register/update user in backend — fire and forget.
          // Do NOT await: a slow or rate-limited backend response must never
          // block the auth loading state and delay the entire app render.
          registerUserInBackend(firebaseUser);
        }
        setUser(firebaseUser);
        setLoading(false);
      },
      (error) => {
        console.error("Firebase auth state change error:", error);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) {
      console.error("Firebase auth not initialized");
      return false;
    }
    const provider = new GoogleAuthProvider();
    // Force account selection every time - allows switching between accounts
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      console.debug("[useFirebaseAuth] starting Google sign-in (popup)");
      await signInWithPopup(auth, provider);
      console.debug("[useFirebaseAuth] Google sign-in popup completed");
      return true;
    } catch (error) {
      console.error("Sign-in error:", error);
      try {
        alert("Google sign-in failed. Check console for details.");
      } catch (_err) {
        console.debug("[useFirebaseAuth] alert failed", _err);
      }
      return false;
    }
  };

  const signOutUser = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  return { user, loading, signInWithGoogle, signOutUser };
}
