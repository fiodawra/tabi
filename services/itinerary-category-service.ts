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
export const PREDEFINED_CATEGORY_COLORS = [
  { id: "slate", value: "#475569" },
  { id: "zinc", value: "#52525b" },
  { id: "stone", value: "#57534e" },
  { id: "red", value: "#dc2626" },
  { id: "orange", value: "#ea580c" },
  { id: "amber", value: "#d97706" },
  { id: "yellow", value: "#ca8a04" },
  { id: "lime", value: "#65a30d" },
  { id: "green", value: "#16a34a" },
  { id: "emerald", value: "#059669" },
  { id: "teal", value: "#0d9488" },
  { id: "cyan", value: "#0891b2" },
  { id: "sky", value: "#0284c7" },
  { id: "blue", value: "#2563eb" },
  { id: "indigo", value: "#4f46e5" },
  { id: "violet", value: "#7c3aed" },
  { id: "purple", value: "#9333ea" },
  { id: "fuchsia", value: "#c026d3" },
  { id: "pink", value: "#db2777" },
  { id: "rose", value: "#e11d48" },
] as const;

export const DEFAULT_CATEGORY_COLOR = "#2563eb";
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const PREDEFINED_CATEGORY_COLOR_VALUES = new Set<string>(
  PREDEFINED_CATEGORY_COLORS.map((color) => color.value),
);

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
  const nextColor = color.trim().toLowerCase();

  if (!nextColor) {
    throw new ItineraryCategoryError("category-color-required");
  }

  if (
    HEX_COLOR_PATTERN.test(nextColor) &&
    PREDEFINED_CATEGORY_COLOR_VALUES.has(nextColor)
  ) {
    return nextColor;
  }

  return DEFAULT_CATEGORY_COLOR;
}

function readCategoryColor(value: unknown) {
  if (typeof value !== "string") {
    return DEFAULT_CATEGORY_COLOR;
  }

  const color = value.trim().toLowerCase();

  return PREDEFINED_CATEGORY_COLOR_VALUES.has(color)
    ? color
    : DEFAULT_CATEGORY_COLOR;
}

function toItineraryCategory(
  categoryDoc: QueryDocumentSnapshot<DocumentData>,
): ItineraryCategory {
  const data = categoryDoc.data() as ItineraryCategoryDocument;

  return {
    id: categoryDoc.id,
    calendarId: data.calendarId ?? "",
    color: readCategoryColor(data.color),
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
