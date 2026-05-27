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

export type ItineraryCategory = {
  calendarId: string;
  color: string;
  createdAt?: Date;
  id: string;
  name: string;
  updatedAt?: Date;
};

export type SaveItineraryCategoryInput = {
  color: string;
  name: string;
};

export type ItineraryCategoryErrorCode =
  | "category-color-required"
  | "category-name-required";

type ItineraryCategoryDocument = {
  calendarId?: string;
  color?: string;
  createdAt?: Date | Timestamp;
  name?: string;
  updatedAt?: Date | Timestamp;
};

const ITINERARY_CATEGORIES_COLLECTION = "itineraryCategories";
const DEFAULT_CATEGORY_COLOR = "#2563eb";
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export class ItineraryCategoryError extends Error {
  code: ItineraryCategoryErrorCode;

  constructor(code: ItineraryCategoryErrorCode) {
    super(code);
    this.name = "ItineraryCategoryError";
    this.code = code;
  }
}

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

  return undefined;
}

function normalizeColor(color: string) {
  const nextColor = color.trim();

  if (!nextColor) {
    throw new ItineraryCategoryError("category-color-required");
  }

  return HEX_COLOR_PATTERN.test(nextColor) ? nextColor : DEFAULT_CATEGORY_COLOR;
}

function toItineraryCategory(
  categoryDoc: QueryDocumentSnapshot<DocumentData>,
): ItineraryCategory {
  const data = categoryDoc.data() as ItineraryCategoryDocument;

  return {
    id: categoryDoc.id,
    calendarId: data.calendarId ?? "",
    color: data.color ?? DEFAULT_CATEGORY_COLOR,
    createdAt: readOptionalDate(data.createdAt),
    name: data.name ?? "",
    updatedAt: readOptionalDate(data.updatedAt),
  };
}

function getItineraryCategoriesQuery(calendarId: string) {
  return query(
    collection(db, ITINERARY_CATEGORIES_COLLECTION),
    where("calendarId", "==", calendarId),
  );
}

function sortCategories(categories: ItineraryCategory[]) {
  return [...categories].sort((firstCategory, secondCategory) =>
    firstCategory.name.localeCompare(secondCategory.name),
  );
}

export async function getItineraryCategories(calendarId: string) {
  const snapshot = await getDocs(getItineraryCategoriesQuery(calendarId));

  return sortCategories(snapshot.docs.map(toItineraryCategory));
}

export function subscribeToItineraryCategories(
  calendarId: string,
  onCategoriesChange: (categories: ItineraryCategory[]) => void,
  onError: (error: FirestoreError) => void,
): Unsubscribe {
  return onSnapshot(
    getItineraryCategoriesQuery(calendarId),
    (snapshot) => {
      onCategoriesChange(
        sortCategories(snapshot.docs.map(toItineraryCategory)),
      );
    },
    onError,
  );
}

export async function createItineraryCategory(
  calendarId: string,
  input: SaveItineraryCategoryInput,
) {
  const name = input.name.trim();
  const color = normalizeColor(input.color);

  if (!name) {
    throw new ItineraryCategoryError("category-name-required");
  }

  await addDoc(collection(db, ITINERARY_CATEGORIES_COLLECTION), {
    calendarId,
    name,
    color,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateItineraryCategory(
  categoryId: string,
  input: SaveItineraryCategoryInput,
) {
  const name = input.name.trim();
  const color = normalizeColor(input.color);

  if (!name) {
    throw new ItineraryCategoryError("category-name-required");
  }

  await updateDoc(doc(db, ITINERARY_CATEGORIES_COLLECTION, categoryId), {
    name,
    color,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteItineraryCategory(categoryId: string) {
  await deleteDoc(doc(db, ITINERARY_CATEGORIES_COLLECTION, categoryId));
}
