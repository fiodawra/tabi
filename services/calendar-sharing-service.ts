import {
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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeUserEmail } from "@/services/user-service";

export type CalendarRole = "viewer" | "editor";
export type CalendarAccess = "owner" | CalendarRole;

export type CalendarShare = {
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
  id: string;
  label: string;
  ownerEmail: string;
  ownerId: string;
  shareId?: string;
};

export type ShareCalendarInput = {
  recipientEmail: string;
  role: CalendarRole;
};

export type CreateCalendarShareInput = ShareCalendarInput & {
  ownerEmail: string;
  ownerId: string;
};

export type CalendarShareErrorCode =
  | "duplicate-share"
  | "email-required"
  | "self-share"
  | "user-not-found";

type CalendarShareDocument = {
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

type RecipientUserDocument = {
  email?: string;
  emailLower?: string;
  name?: string;
};

const CALENDAR_SHARES_COLLECTION = "calendarShares";
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

  return {
    id: shareDoc.id,
    createdAt: readOptionalDate(data.createdAt),
    ownerEmail: data.ownerEmail ?? "",
    ownerEmailLower: data.ownerEmailLower ?? "",
    ownerId: data.ownerId ?? "",
    recipientEmail: data.recipientEmail ?? "",
    recipientEmailLower: data.recipientEmailLower ?? "",
    recipientUid: data.recipientUid ?? "",
    role: isCalendarRole(data.role) ? data.role : "viewer",
    updatedAt: readOptionalDate(data.updatedAt),
  };
}

function getCalendarShareId(ownerId: string, recipientUid: string) {
  return `${ownerId}_${recipientUid}`;
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
  return [...shares].sort((firstShare, secondShare) =>
    firstShare.ownerEmail.localeCompare(secondShare.ownerEmail),
  );
}

function sortOutgoingShares(shares: CalendarShare[]) {
  return [...shares].sort((firstShare, secondShare) =>
    firstShare.recipientEmail.localeCompare(secondShare.recipientEmail),
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
    getCalendarShareId(input.ownerId, recipient.uid),
  );
  const existingShare = await getDoc(shareRef);

  if (existingShare.exists()) {
    throw new CalendarShareError("duplicate-share");
  }

  await setDoc(shareRef, {
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
