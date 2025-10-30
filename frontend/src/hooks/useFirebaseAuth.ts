import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
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
    // Check for redirect result first
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("User signed in via redirect:", result.user.email);
          // The user will be handled by onAuthStateChanged below
        }
      } catch (error) {
        console.error("Redirect sign-in error:", error);
        setLoading(false);
      }
    };

    checkRedirectResult();

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
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
      // Note: After redirect, the page will reload and the user will be handled by getRedirectResult
    } catch (error) {
      console.error("Sign-in error:", error);
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  return { user, loading, signInWithGoogle, signOutUser };
}
