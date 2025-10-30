import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "../firebase";
import axios from "axios";

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const registerUserInBackend = async (firebaseUser: User) => {
    try {
      await axios.post("http://localhost:3001/api/auth/register", {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      });
      console.log("User registered in backend:", firebaseUser.email);
    } catch (error) {
      console.error("Failed to register user in backend:", error);
      // Don't fail the auth process if backend registration fails
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Register/update user in backend when they authenticate
        await registerUserInBackend(firebaseUser);
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      console.debug("[useFirebaseAuth] starting Google sign-in (popup)");
      await signInWithPopup(auth, provider);
      console.debug("[useFirebaseAuth] Google sign-in popup completed");
      return true;
    } catch (error) {
      console.error("Sign-in error:", error);
      try {
        alert("Google sign-in failed. Check console for details.");
      } catch (e) {}
      return false;
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  return { user, loading, signInWithGoogle, signOutUser };
}
