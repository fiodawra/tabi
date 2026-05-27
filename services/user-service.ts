import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db, type User } from "@/lib/firebase";

export type UserLevel = "admin" | "member";

export type UserProfile = {
  bio: string;
  email: string;
  emailLower: string;
  level: UserLevel;
  name: string;
};

export function normalizeUserEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function ensureUserProfile(user: User) {
  const userRef = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userRef);
  const email = user.email ?? "";
  const emailLower = normalizeUserEmail(email);

  if (userSnapshot.exists()) {
    await updateDoc(userRef, {
      email,
      emailLower,
    });
    return;
  }

  const profile: UserProfile = {
    name: user.displayName ?? "",
    email,
    emailLower,
    level: "member",
    bio: "",
  };

  await setDoc(userRef, profile);
}

export async function getUserProfile(uid: string) {
  const userRef = doc(db, "users", uid);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    return null;
  }

  return userSnapshot.data() as UserProfile;
}

export async function updateUserProfile(
  uid: string,
  input: Pick<UserProfile, "bio" | "name">,
) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, input);
}
