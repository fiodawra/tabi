"use client";

import {
  getRedirectResult,
  signInWithRedirect,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { auth, googleProvider } from "@/lib/firebase";
import { ensureUserProfile } from "@/services/user-service";

export type AuthUser = {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  uid: string;
};

type AuthState = {
  completeRedirectSignIn: () => Promise<void>;
  isLoading: boolean;
  setIsLoading: (next: boolean) => void;
  setUserFromFirebase: (user: FirebaseUser | null) => void;
  signInWithGoogle: () => Promise<"redirecting" | "signed-in">;
  signOutUser: () => Promise<void>;
  user: AuthUser | null;
};

export class AuthDomainError extends Error {
  constructor() {
    super("Firebase auth domain is not authorized.");
    this.name = "AuthDomainError";
  }
}

function toAuthUser(user: FirebaseUser): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      completeRedirectSignIn: async () => {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          await ensureUserProfile(result.user);
        }
      },
      setIsLoading: (next) => set({ isLoading: next }),
      setUserFromFirebase: (user) =>
        set({
          user: user ? toAuthUser(user) : null,
        }),
      signInWithGoogle: async () => {
        try {
          const result = await signInWithPopup(auth, googleProvider);
          await ensureUserProfile(result.user);
          return "signed-in";
        } catch (error) {
          if (
            error instanceof FirebaseError &&
            error.code === "auth/unauthorized-domain"
          ) {
            throw new AuthDomainError();
          }

          if (
            error instanceof FirebaseError &&
            (error.code === "auth/popup-blocked" ||
              error.code === "auth/operation-not-supported-in-this-environment")
          ) {
            await signInWithRedirect(auth, googleProvider);
            return "redirecting";
          }

          throw error;
        }
      },
      signOutUser: async () => {
        await signOut(auth);
      },
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
      }),
    },
  ),
);
