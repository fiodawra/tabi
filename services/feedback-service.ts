import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type FeedbackStatus = "accepted" | "reviewed" | "rejected";

export type Feedback = {
  createdAt?: Timestamp;
  description: string;
  id: string;
  status: FeedbackStatus;
  title: string;
  userName: string;
  userId: string;
};

type CreateFeedbackInput = {
  description: string;
  title: string;
  userName: string;
  userId: string;
};

const FEEDBACK_COLLECTION = "feedbacks";

export async function createFeedback(input: CreateFeedbackInput) {
  await addDoc(collection(db, FEEDBACK_COLLECTION), {
    userId: input.userId,
    userName: input.userName,
    title: input.title,
    description: input.description,
    status: "reviewed" as FeedbackStatus,
    createdAt: serverTimestamp(),
  });
}

export async function getFeedbackList() {
  const feedbackQuery = query(
    collection(db, FEEDBACK_COLLECTION),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(feedbackQuery);

  return snapshot.docs.map((feedbackDoc) => ({
    id: feedbackDoc.id,
    ...(feedbackDoc.data() as Omit<Feedback, "id">),
  }));
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus,
) {
  await updateDoc(doc(db, FEEDBACK_COLLECTION, feedbackId), { status });
}
