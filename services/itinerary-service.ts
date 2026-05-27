import {
  addDoc,
  collection,
  type DocumentData,
  deleteDoc,
  doc,
  type FirestoreError,
  getDocs,
  onSnapshot,
  type QueryDocumentSnapshot,
  query,
  serverTimestamp,
  type Timestamp,
  type Unsubscribe,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ItineraryItem = {
  allDay: boolean;
  category: string | null;
  createdAt?: Date;
  description: string;
  endAt: Date;
  id: string;
  location: string;
  startAt: Date;
  title: string;
  updatedAt?: Date;
  userId: string;
};

export type SaveItineraryItemInput = {
  allDay: boolean;
  category?: string | null;
  description: string;
  endAt: Date;
  location: string;
  startAt: Date;
  title: string;
};

type CreateItineraryItemInput = SaveItineraryItemInput & {
  userId: string;
};

type ItineraryItemDocument = {
  allDay?: boolean;
  category?: string;
  createdAt?: Date | Timestamp;
  description?: string;
  endAt?: Date | Timestamp | string | number;
  location?: string;
  startAt?: Date | Timestamp | string | number;
  title?: string;
  updatedAt?: Date | Timestamp;
  userId?: string;
};

const ITINERARY_COLLECTION = "itineraryItems";

function readOptionalDate(value: unknown): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate();
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  return undefined;
}

function readOptionalCategory(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function readRequiredDate(value: unknown) {
  return readOptionalDate(value) ?? new Date();
}

function toItineraryItem(
  itineraryDoc: QueryDocumentSnapshot<DocumentData>,
): ItineraryItem {
  const data = itineraryDoc.data() as ItineraryItemDocument;

  return {
    id: itineraryDoc.id,
    allDay: Boolean(data.allDay),
    category: readOptionalCategory(data.category),
    createdAt: readOptionalDate(data.createdAt),
    description: data.description ?? "",
    endAt: readRequiredDate(data.endAt),
    location: data.location ?? "",
    startAt: readRequiredDate(data.startAt),
    title: data.title ?? "",
    updatedAt: readOptionalDate(data.updatedAt),
    userId: data.userId ?? "",
  };
}

function getItineraryItemsQuery(userId: string) {
  return query(
    collection(db, ITINERARY_COLLECTION),
    where("userId", "==", userId),
  );
}

function sortItineraryItems(items: ItineraryItem[]) {
  return [...items].sort((firstItem, secondItem) => {
    return firstItem.startAt.getTime() - secondItem.startAt.getTime();
  });
}

export async function getItineraryItems(userId: string) {
  const snapshot = await getDocs(getItineraryItemsQuery(userId));

  return sortItineraryItems(snapshot.docs.map(toItineraryItem));
}

export function subscribeToItineraryItems(
  userId: string,
  onItemsChange: (items: ItineraryItem[]) => void,
  onError: (error: FirestoreError) => void,
): Unsubscribe {
  return onSnapshot(
    getItineraryItemsQuery(userId),
    (snapshot) => {
      onItemsChange(sortItineraryItems(snapshot.docs.map(toItineraryItem)));
    },
    onError,
  );
}

export async function createItineraryItem(input: CreateItineraryItemInput) {
  await addDoc(collection(db, ITINERARY_COLLECTION), {
    userId: input.userId,
    title: input.title,
    description: input.description,
    location: input.location,
    category: input.category ?? null,
    startAt: input.startAt,
    endAt: input.endAt,
    allDay: input.allDay,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateItineraryItem(
  itineraryItemId: string,
  input: Partial<SaveItineraryItemInput>,
) {
  await updateDoc(doc(db, ITINERARY_COLLECTION, itineraryItemId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteItineraryItem(itineraryItemId: string) {
  await deleteDoc(doc(db, ITINERARY_COLLECTION, itineraryItemId));
}
