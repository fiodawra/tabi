import {
  addDoc,
  collection,
  type DocumentData,
  deleteDoc,
  doc,
  type FirestoreError,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  type QueryDocumentSnapshot,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
  type Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeUserEmail } from "@/services/user-service";

export type CalendarRole = "viewer" | "editor";
export type CalendarAccess = "owner" | CalendarRole;

export type CalendarShare = {
  calendarArchivedAt?: Date;
  calendarDescription: string;
  calendarId: string;
  calendarLabel: string;
  calendarTitle: string;
  createdAt?: Date;
  id: string;
  ownerEmail: string;
  ownerEmailLower: string;
  ownerId: string;
  recipientEmail: string;
  recipientEmailLower: string;
  recipientUid: string;
  role: CalendarRole;
  updatedAt?: Date;
};

export type CalendarSummary = {
  access: CalendarAccess;
  archivedAt?: Date;
  description: string;
  id: string;
  label: string;
  ownerEmail: string;
  ownerId: string;
  shareId?: string;
};

export type ShareCalendarInput = {
  calendarDescription: string;
  calendarId: string;
  calendarLabel: string;
  calendarTitle: string;
  recipientEmail: string;
  role: CalendarRole;
};

export type CreateCalendarShareInput = ShareCalendarInput & {
  ownerEmail: string;
  ownerId: string;
};

export type CalendarShareErrorCode =
  | "calendar-name-required"
  | "duplicate-share"
  | "email-required"
  | "self-share"
  | "user-not-found";

export type UserCalendar = {
  archivedAt?: Date;
  createdAt?: Date;
  description: string;
  id: string;
  ownerId: string;
  title: string;
  updatedAt?: Date;
};

export type SaveUserCalendarInput = {
  description: string;
  title: string;
};

type CalendarShareDocument = {
  calendarArchivedAt?: Date | Timestamp;
  calendarDescription?: string;
  calendarId?: string;
  calendarLabel?: string;
  calendarTitle?: string;
  createdAt?: Date | Timestamp;
  ownerEmail?: string;
  ownerEmailLower?: string;
  ownerId?: string;
  recipientEmail?: string;
  recipientEmailLower?: string;
  recipientUid?: string;
  role?: string;
  updatedAt?: Date | Timestamp;
};

type UserCalendarDocument = {
  archivedAt?: Date | Timestamp;
  createdAt?: Date | Timestamp;
  description?: string;
  name?: string;
  ownerId?: string;
  title?: string;
  updatedAt?: Date | Timestamp;
};

type RecipientUserDocument = {
  email?: string;
  emailLower?: string;
  name?: string;
};

const CALENDAR_SHARES_COLLECTION = "calendarShares";
const CALENDARS_COLLECTION = "calendars";
const USERS_COLLECTION = "users";

export class CalendarShareError extends Error {
  code: CalendarShareErrorCode;

  constructor(code: CalendarShareErrorCode) {
    super(code);
    this.name = "CalendarShareError";
    this.code = code;
  }
}

function isCalendarRole(value: unknown): value is CalendarRole {
  return value === "viewer" || value === "editor";
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

function toCalendarShare(
  shareDoc: QueryDocumentSnapshot<DocumentData>,
): CalendarShare {
  const data = shareDoc.data() as CalendarShareDocument;
  const ownerId = data.ownerId ?? "";

  return {
    id: shareDoc.id,
    calendarArchivedAt: readOptionalDate(data.calendarArchivedAt),
    calendarDescription: data.calendarDescription ?? "",
    calendarId: data.calendarId ?? ownerId,
    calendarLabel:
      data.calendarTitle ?? data.calendarLabel ?? data.ownerEmail ?? "",
    calendarTitle:
      data.calendarTitle ?? data.calendarLabel ?? data.ownerEmail ?? "",
    createdAt: readOptionalDate(data.createdAt),
    ownerEmail: data.ownerEmail ?? "",
    ownerEmailLower: data.ownerEmailLower ?? "",
    ownerId,
    recipientEmail: data.recipientEmail ?? "",
    recipientEmailLower: data.recipientEmailLower ?? "",
    recipientUid: data.recipientUid ?? "",
    role: isCalendarRole(data.role) ? data.role : "viewer",
    updatedAt: readOptionalDate(data.updatedAt),
  };
}

function toUserCalendar(
  calendarDoc: QueryDocumentSnapshot<DocumentData>,
): UserCalendar {
  const data = calendarDoc.data() as UserCalendarDocument;
  const title = data.title ?? data.name ?? "";

  return {
    id: calendarDoc.id,
    archivedAt: readOptionalDate(data.archivedAt),
    createdAt: readOptionalDate(data.createdAt),
    description: data.description ?? "",
    ownerId: data.ownerId ?? "",
    title,
    updatedAt: readOptionalDate(data.updatedAt),
  };
}

function getCalendarShareId(calendarId: string, recipientUid: string) {
  return `${calendarId}_${recipientUid}`;
}

function getUserCalendarsQuery(ownerId: string) {
  return query(
    collection(db, CALENDARS_COLLECTION),
    where("ownerId", "==", ownerId),
  );
}

function getIncomingCalendarSharesQuery(recipientUid: string) {
  return query(
    collection(db, CALENDAR_SHARES_COLLECTION),
    where("recipientUid", "==", recipientUid),
  );
}

function getOutgoingCalendarSharesQuery(ownerId: string) {
  return query(
    collection(db, CALENDAR_SHARES_COLLECTION),
    where("ownerId", "==", ownerId),
  );
}

function sortIncomingShares(shares: CalendarShare[]) {
  return [...shares]
    .filter((share) => !share.calendarArchivedAt)
    .sort((firstShare, secondShare) =>
      firstShare.calendarTitle.localeCompare(secondShare.calendarTitle),
    );
}

function sortOutgoingShares(shares: CalendarShare[]) {
  return [...shares].sort((firstShare, secondShare) =>
    firstShare.recipientEmail.localeCompare(secondShare.recipientEmail),
  );
}

function sortUserCalendars(calendars: UserCalendar[]) {
  return [...calendars].sort((firstCalendar, secondCalendar) =>
    firstCalendar.title.localeCompare(secondCalendar.title),
  );
}

async function findRecipientByEmail(emailLower: string) {
  const snapshot = await getDocs(
    query(
      collection(db, USERS_COLLECTION),
      where("emailLower", "==", emailLower),
      limit(1),
    ),
  );
  const recipientDoc = snapshot.docs.at(0);

  if (!recipientDoc) {
    return null;
  }

  const recipient = recipientDoc.data() as RecipientUserDocument;

  return {
    uid: recipientDoc.id,
    email: recipient.email ?? emailLower,
    emailLower: recipient.emailLower ?? emailLower,
    name: recipient.name ?? "",
  };
}

export async function getIncomingCalendarShares(recipientUid: string) {
  const snapshot = await getDocs(getIncomingCalendarSharesQuery(recipientUid));

  return sortIncomingShares(snapshot.docs.map(toCalendarShare));
}

export async function getUserCalendars(ownerId: string) {
  const snapshot = await getDocs(getUserCalendarsQuery(ownerId));

  return sortUserCalendars(snapshot.docs.map(toUserCalendar));
}

export async function getOutgoingCalendarShares(ownerId: string) {
  const snapshot = await getDocs(getOutgoingCalendarSharesQuery(ownerId));

  return sortOutgoingShares(snapshot.docs.map(toCalendarShare));
}

export function subscribeToIncomingCalendarShares(
  recipientUid: string,
  onSharesChange: (shares: CalendarShare[]) => void,
  onError: (error: FirestoreError) => void,
): Unsubscribe {
  return onSnapshot(
    getIncomingCalendarSharesQuery(recipientUid),
    (snapshot) => {
      onSharesChange(sortIncomingShares(snapshot.docs.map(toCalendarShare)));
    },
    onError,
  );
}

export function subscribeToOutgoingCalendarShares(
  ownerId: string,
  onSharesChange: (shares: CalendarShare[]) => void,
  onError: (error: FirestoreError) => void,
): Unsubscribe {
  return onSnapshot(
    getOutgoingCalendarSharesQuery(ownerId),
    (snapshot) => {
      onSharesChange(sortOutgoingShares(snapshot.docs.map(toCalendarShare)));
    },
    onError,
  );
}

export function subscribeToUserCalendars(
  ownerId: string,
  onCalendarsChange: (calendars: UserCalendar[]) => void,
  onError: (error: FirestoreError) => void,
): Unsubscribe {
  return onSnapshot(
    getUserCalendarsQuery(ownerId),
    (snapshot) => {
      onCalendarsChange(sortUserCalendars(snapshot.docs.map(toUserCalendar)));
    },
    onError,
  );
}

export async function createUserCalendar(
  ownerId: string,
  input: SaveUserCalendarInput,
) {
  const title = input.title.trim();
  const description = input.description.trim();

  if (!title) {
    throw new CalendarShareError("calendar-name-required");
  }

  const calendarRef = await addDoc(collection(db, CALENDARS_COLLECTION), {
    ownerId,
    title,
    description,
    archivedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return calendarRef.id;
}

export async function updateUserCalendar(
  calendarId: string,
  input: SaveUserCalendarInput,
) {
  const title = input.title.trim();
  const description = input.description.trim();

  if (!title) {
    throw new CalendarShareError("calendar-name-required");
  }

  const sharesSnapshot = await getDocs(
    query(
      collection(db, CALENDAR_SHARES_COLLECTION),
      where("calendarId", "==", calendarId),
    ),
  );
  const batch = writeBatch(db);

  batch.update(doc(db, CALENDARS_COLLECTION, calendarId), {
    title,
    description,
    updatedAt: serverTimestamp(),
  });

  for (const shareDoc of sharesSnapshot.docs) {
    batch.update(shareDoc.ref, {
      calendarLabel: title,
      calendarTitle: title,
      calendarDescription: description,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

export async function deleteUserCalendar(calendarId: string) {
  const sharesSnapshot = await getDocs(
    query(
      collection(db, CALENDAR_SHARES_COLLECTION),
      where("calendarId", "==", calendarId),
    ),
  );
  const batch = writeBatch(db);
  const archivedAt = serverTimestamp();

  batch.update(doc(db, CALENDARS_COLLECTION, calendarId), {
    archivedAt,
    updatedAt: serverTimestamp(),
  });

  for (const shareDoc of sharesSnapshot.docs) {
    batch.update(shareDoc.ref, {
      calendarArchivedAt: archivedAt,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

export async function createCalendarShare(input: CreateCalendarShareInput) {
  const recipientEmailLower = normalizeUserEmail(input.recipientEmail);
  const ownerEmailLower = normalizeUserEmail(input.ownerEmail);

  if (!recipientEmailLower) {
    throw new CalendarShareError("email-required");
  }

  if (recipientEmailLower === ownerEmailLower) {
    throw new CalendarShareError("self-share");
  }

  const recipient = await findRecipientByEmail(recipientEmailLower);

  if (!recipient) {
    throw new CalendarShareError("user-not-found");
  }

  if (recipient.uid === input.ownerId) {
    throw new CalendarShareError("self-share");
  }

  const shareRef = doc(
    db,
    CALENDAR_SHARES_COLLECTION,
    getCalendarShareId(input.calendarId, recipient.uid),
  );
  const existingShare = await getDoc(shareRef);

  if (existingShare.exists()) {
    throw new CalendarShareError("duplicate-share");
  }

  await setDoc(shareRef, {
    calendarId: input.calendarId,
    calendarLabel: input.calendarLabel,
    calendarTitle: input.calendarTitle,
    calendarDescription: input.calendarDescription,
    calendarArchivedAt: null,
    ownerId: input.ownerId,
    ownerEmail: input.ownerEmail,
    ownerEmailLower,
    recipientUid: recipient.uid,
    recipientEmail: recipient.email,
    recipientEmailLower: recipient.emailLower,
    role: input.role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCalendarShareRole(
  shareId: string,
  role: CalendarRole,
) {
  await updateDoc(doc(db, CALENDAR_SHARES_COLLECTION, shareId), {
    role,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCalendarShare(shareId: string) {
  await deleteDoc(doc(db, CALENDAR_SHARES_COLLECTION, shareId));
}
