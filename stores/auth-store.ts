"use client";

import {
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
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
  isLoading: boolean;
  setIsLoading: (next: boolean) => void;
  setUserFromFirebase: (user: FirebaseUser | null) => void;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  user: AuthUser | null;
};

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
      setIsLoading: (next) => set({ isLoading: next }),
      setUserFromFirebase: (user) =>
        set({
          user: user ? toAuthUser(user) : null,
        }),
      signInWithGoogle: async () => {
        const result = await signInWithPopup(auth, googleProvider);
        await ensureUserProfile(result.user);
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
