import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db, type User } from "@/lib/firebase";

export type UserLevel = "admin" | "member";

export type UserProfile = {
  bio: string;
  level: UserLevel;
  name: string;
};

export async function ensureUserProfile(user: User) {
  const userRef = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userRef);

  if (userSnapshot.exists()) {
    return;
  }

  const profile: UserProfile = {
    name: user.displayName ?? "",
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
