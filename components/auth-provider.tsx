"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/stores/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const completeRedirectSignIn = useAuth(
    (state) => state.completeRedirectSignIn,
  );
  const setIsLoading = useAuth((state) => state.setIsLoading);
  const setUserFromFirebase = useAuth((state) => state.setUserFromFirebase);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUserFromFirebase(nextUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [setIsLoading, setUserFromFirebase]);

  useEffect(() => {
    void completeRedirectSignIn();
  }, [completeRedirectSignIn]);

  return children;
}
