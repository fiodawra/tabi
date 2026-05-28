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

export type RecurrencePreset =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "weekdays"
  | "weekends"
  | "custom";

export type RecurrenceFrequency = "day" | "week" | "month" | "year";

export type RecurrenceEnd =
  | {
      mode: "never";
    }
  | {
      date: Date;
      mode: "onDate";
    }
  | {
      count: number;
      mode: "afterCount";
    };

export type ItineraryRecurrence = {
  end: RecurrenceEnd;
  frequency?: RecurrenceFrequency;
  preset: Exclude<RecurrencePreset, "none">;
  repeatEvery?: number;
  weekdays?: number[];
};

export type ItineraryOccurrenceOverride = {
  allDay?: boolean;
  category?: string | null;
  description?: string;
  endAt?: Date;
  location?: string;
  startAt?: Date;
  title?: string;
};

export type ItineraryItem = {
  allDay: boolean;
  category: string | null;
  createdAt?: Date;
  deletedOccurrenceDates: string[];
  description: string;
  endAt: Date;
  id: string;
  location: string;
  modifiedOccurrences: Record<string, ItineraryOccurrenceOverride>;
  recurrence: ItineraryRecurrence | null;
  startAt: Date;
  title: string;
  updatedAt?: Date;
  userId: string;
};

export type SaveItineraryItemInput = {
  allDay: boolean;
  category?: string | null;
  deletedOccurrenceDates?: string[];
  description: string;
  endAt: Date;
  location: string;
  modifiedOccurrences?: Record<string, ItineraryOccurrenceOverride>;
  recurrence?: ItineraryRecurrence | null;
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
  deletedOccurrenceDates?: unknown;
  description?: string;
  endAt?: Date | Timestamp | string | number;
  location?: string;
  modifiedOccurrences?: unknown;
  recurrence?: unknown;
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

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function readRecurrenceEnd(value: unknown): RecurrenceEnd {
  if (!value || typeof value !== "object") {
    return { mode: "never" };
  }

  const data = value as { count?: unknown; date?: unknown; mode?: unknown };

  if (data.mode === "onDate") {
    return {
      date: readRequiredDate(data.date),
      mode: "onDate",
    };
  }

  if (data.mode === "afterCount") {
    return {
      count:
        typeof data.count === "number" && Number.isFinite(data.count)
          ? Math.max(1, Math.floor(data.count))
          : 1,
      mode: "afterCount",
    };
  }

  return { mode: "never" };
}

function readRecurrence(value: unknown): ItineraryRecurrence | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const data = value as {
    end?: unknown;
    frequency?: unknown;
    preset?: unknown;
    repeatEvery?: unknown;
    weekdays?: unknown;
  };
  const presets = new Set<ItineraryRecurrence["preset"]>([
    "daily",
    "weekly",
    "monthly",
    "weekdays",
    "weekends",
    "custom",
  ]);

  if (
    typeof data.preset !== "string" ||
    !presets.has(data.preset as ItineraryRecurrence["preset"])
  ) {
    return null;
  }

  const preset = data.preset as ItineraryRecurrence["preset"];

  const frequencies = new Set<RecurrenceFrequency>([
    "day",
    "week",
    "month",
    "year",
  ]);
  const recurrence: ItineraryRecurrence = {
    end: readRecurrenceEnd(data.end),
    preset,
  };

  if (
    typeof data.frequency === "string" &&
    frequencies.has(data.frequency as RecurrenceFrequency)
  ) {
    recurrence.frequency = data.frequency as RecurrenceFrequency;
  }

  if (
    typeof data.repeatEvery === "number" &&
    Number.isFinite(data.repeatEvery)
  ) {
    recurrence.repeatEvery = Math.max(1, Math.floor(data.repeatEvery));
  }

  if (Array.isArray(data.weekdays)) {
    recurrence.weekdays = data.weekdays
      .filter(
        (weekday): weekday is number =>
          typeof weekday === "number" &&
          Number.isInteger(weekday) &&
          weekday >= 0 &&
          weekday <= 6,
      )
      .filter((weekday, index, weekdays) => weekdays.indexOf(weekday) === index)
      .sort((firstWeekday, secondWeekday) => firstWeekday - secondWeekday);
  }

  return recurrence;
}

function readOccurrenceOverride(value: unknown): ItineraryOccurrenceOverride {
  if (!value || typeof value !== "object") {
    return {};
  }

  const data = value as {
    allDay?: unknown;
    category?: unknown;
    description?: unknown;
    endAt?: unknown;
    location?: unknown;
    startAt?: unknown;
    title?: unknown;
  };
  const override: ItineraryOccurrenceOverride = {};
  const startAt = readOptionalDate(data.startAt);
  const endAt = readOptionalDate(data.endAt);

  if (typeof data.allDay === "boolean") {
    override.allDay = data.allDay;
  }

  if ("category" in data) {
    override.category = readOptionalCategory(data.category);
  }

  if (typeof data.description === "string") {
    override.description = data.description;
  }

  if (endAt) {
    override.endAt = endAt;
  }

  if (typeof data.location === "string") {
    override.location = data.location;
  }

  if (startAt) {
    override.startAt = startAt;
  }

  if (typeof data.title === "string") {
    override.title = data.title;
  }

  return override;
}

function readModifiedOccurrences(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([dateKey, override]) => [
      dateKey,
      readOccurrenceOverride(override),
    ]),
  );
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
    deletedOccurrenceDates: readStringArray(data.deletedOccurrenceDates),
    description: data.description ?? "",
    endAt: readRequiredDate(data.endAt),
    location: data.location ?? "",
    modifiedOccurrences: readModifiedOccurrences(data.modifiedOccurrences),
    recurrence: readRecurrence(data.recurrence),
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
    recurrence: input.recurrence ?? null,
    deletedOccurrenceDates: input.deletedOccurrenceDates ?? [],
    modifiedOccurrences: input.modifiedOccurrences ?? {},
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
