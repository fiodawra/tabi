import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  differenceInCalendarYears,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import type {
  ItineraryItem,
  ItineraryOccurrenceOverride,
  ItineraryRecurrence,
  RecurrenceFrequency,
  RecurrencePreset,
  SaveItineraryItemInput,
} from "@/services/itinerary-service";
import type { CalendarEvent, CategoryLookup } from "./itinerary-types";

export const RECURRENCE_PRESETS: RecurrencePreset[] = [
  "none",
  "daily",
  "weekly",
  "monthly",
  "weekdays",
  "weekends",
  "custom",
];

export const CUSTOM_RECURRENCE_FREQUENCIES: RecurrenceFrequency[] = [
  "day",
  "week",
  "month",
  "year",
];

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

type RecurrenceRange = {
  rangeEnd: Date;
  rangeStart: Date;
};

type OccurrenceValues = {
  allDay: boolean;
  category: string | null;
  description: string;
  endAt: Date;
  location: string;
  startAt: Date;
  title: string;
};

export function formatDateKey(date: Date) {
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date(Number.NaN);
  }

  return new Date(year, month - 1, day);
}

export function getDefaultCustomRecurrence(startAt: Date): ItineraryRecurrence {
  return {
    end: { mode: "never" },
    frequency: "week",
    preset: "custom",
    repeatEvery: 1,
    weekdays: [startAt.getDay()],
  };
}

export function getRecurrenceForPreset(
  preset: RecurrencePreset,
  startAt: Date,
) {
  if (preset === "none") {
    return null;
  }

  if (preset === "custom") {
    return getDefaultCustomRecurrence(startAt);
  }

  return {
    end: { mode: "never" },
    preset,
  } satisfies ItineraryRecurrence;
}

export function getRecurrencePreset(
  recurrence: ItineraryRecurrence | null | undefined,
): RecurrencePreset {
  return recurrence?.preset ?? "none";
}

export function getCalendarExpansionRange(view: string, selectedDate: Date) {
  if (view === "month") {
    return {
      rangeEnd: addDays(endOfMonth(selectedDate), 7),
      rangeStart: subDays(startOfMonth(selectedDate), 7),
    };
  }

  if (view === "week" || view === "work_week") {
    return {
      rangeEnd: addDays(endOfWeek(selectedDate), 1),
      rangeStart: subDays(startOfWeek(selectedDate), 1),
    };
  }

  if (view === "agenda") {
    return {
      rangeEnd: addMonths(endOfDay(selectedDate), 1),
      rangeStart: startOfDay(selectedDate),
    };
  }

  return {
    rangeEnd: addDays(endOfDay(selectedDate), 1),
    rangeStart: subDays(startOfDay(selectedDate), 1),
  };
}

export function getUpcomingExpansionRange() {
  const today = new Date();

  return {
    rangeEnd: addMonths(endOfDay(today), 12),
    rangeStart: startOfDay(today),
  };
}

export function getOccurrenceOverrideInput(
  input: SaveItineraryItemInput,
): ItineraryOccurrenceOverride {
  return {
    allDay: input.allDay,
    category: input.category ?? null,
    description: input.description,
    endAt: input.endAt,
    location: input.location,
    startAt: input.startAt,
    title: input.title,
  };
}

export function getOccurrenceUpdatePatch(
  item: ItineraryItem,
  occurrenceDateKey: string,
  input: SaveItineraryItemInput,
) {
  return {
    deletedOccurrenceDates: item.deletedOccurrenceDates.filter(
      (dateKey) => dateKey !== occurrenceDateKey,
    ),
    modifiedOccurrences: {
      ...item.modifiedOccurrences,
      [occurrenceDateKey]: getOccurrenceOverrideInput(input),
    },
  };
}

export function getOccurrenceDeletePatch(
  item: ItineraryItem,
  occurrenceDateKey: string,
) {
  const modifiedOccurrences = { ...item.modifiedOccurrences };
  delete modifiedOccurrences[occurrenceDateKey];

  return {
    deletedOccurrenceDates: [
      ...new Set([...item.deletedOccurrenceDates, occurrenceDateKey]),
    ].sort(),
    modifiedOccurrences,
  };
}

export function toCalendarEvents(
  itineraryItems: ItineraryItem[],
  categoryMap: CategoryLookup,
  visibleCategoryIdSet: Set<string>,
  isUncategorizedFilterVisible: boolean,
  range: RecurrenceRange,
) {
  return itineraryItems.flatMap((item) =>
    toItemCalendarEvents(
      item,
      categoryMap,
      visibleCategoryIdSet,
      isUncategorizedFilterVisible,
      range,
    ),
  );
}

function toItemCalendarEvents(
  item: ItineraryItem,
  categoryMap: CategoryLookup,
  visibleCategoryIdSet: Set<string>,
  isUncategorizedFilterVisible: boolean,
  range: RecurrenceRange,
) {
  if (!item.recurrence) {
    const event = createCalendarEvent({
      dateKey: null,
      id: item.id,
      isModified: false,
      item,
      values: getBaseOccurrenceValues(item),
    });

    return isEventVisible(
      event,
      categoryMap,
      visibleCategoryIdSet,
      isUncategorizedFilterVisible,
      range,
    )
      ? [event]
      : [];
  }

  const deletedDateKeys = new Set(item.deletedOccurrenceDates);
  const generatedDateKeys = new Set<string>();
  const events: CalendarEvent[] = [];

  for (const date of getScheduledOccurrenceDates(item, range)) {
    const dateKey = formatDateKey(date);
    generatedDateKeys.add(dateKey);

    if (deletedDateKeys.has(dateKey)) {
      continue;
    }

    const event = createCalendarEvent({
      dateKey,
      id: `${item.id}:${dateKey}`,
      isModified: Boolean(item.modifiedOccurrences[dateKey]),
      item,
      values: getOccurrenceValues(
        item,
        date,
        item.modifiedOccurrences[dateKey],
      ),
    });

    if (
      isEventVisible(
        event,
        categoryMap,
        visibleCategoryIdSet,
        isUncategorizedFilterVisible,
        range,
      )
    ) {
      events.push(event);
    }
  }

  for (const [dateKey, override] of Object.entries(item.modifiedOccurrences)) {
    if (generatedDateKeys.has(dateKey) || deletedDateKeys.has(dateKey)) {
      continue;
    }

    const event = createCalendarEvent({
      dateKey,
      id: `${item.id}:${dateKey}`,
      isModified: true,
      item,
      values: getOccurrenceValues(item, parseDateKey(dateKey), override),
    });

    if (
      isEventVisible(
        event,
        categoryMap,
        visibleCategoryIdSet,
        isUncategorizedFilterVisible,
        range,
      )
    ) {
      events.push(event);
    }
  }

  return events.sort(
    (firstEvent, secondEvent) =>
      firstEvent.start.getTime() - secondEvent.start.getTime(),
  );
}

function getScheduledOccurrenceDates(
  item: ItineraryItem,
  range: RecurrenceRange,
) {
  const dates: Date[] = [];
  const recurrence = item.recurrence;

  if (!recurrence) {
    return dates;
  }

  const baseDate = startOfDay(item.startAt);
  let currentDate = new Date(baseDate);
  const endDate =
    recurrence.end.mode === "onDate"
      ? new Date(
          Math.min(
            range.rangeEnd.getTime(),
            endOfDay(recurrence.end.date).getTime(),
          ),
        )
      : range.rangeEnd;
  let scheduledCount = 0;

  while (currentDate <= endDate) {
    if (matchesRecurrenceDate(currentDate, item)) {
      scheduledCount += 1;

      if (
        recurrence.end.mode === "afterCount" &&
        scheduledCount > recurrence.end.count
      ) {
        break;
      }

      const occurrenceStart = withTime(currentDate, item.startAt);
      const occurrenceEnd = new Date(
        occurrenceStart.getTime() + getItemDuration(item),
      );

      if (overlapsRange(occurrenceStart, occurrenceEnd, range)) {
        dates.push(new Date(currentDate));
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  return dates;
}

function matchesRecurrenceDate(candidateDate: Date, item: ItineraryItem) {
  const recurrence = item.recurrence;
  const baseDate = startOfDay(item.startAt);

  if (!recurrence || candidateDate < baseDate) {
    return false;
  }

  if (recurrence.preset === "daily") {
    return true;
  }

  if (recurrence.preset === "weekly") {
    return candidateDate.getDay() === baseDate.getDay();
  }

  if (recurrence.preset === "monthly") {
    return matchesMonthlyDate(candidateDate, baseDate, 1);
  }

  if (recurrence.preset === "weekdays") {
    return candidateDate.getDay() >= 1 && candidateDate.getDay() <= 5;
  }

  if (recurrence.preset === "weekends") {
    return candidateDate.getDay() === 0 || candidateDate.getDay() === 6;
  }

  return matchesCustomRecurrenceDate(candidateDate, baseDate, recurrence);
}

function matchesCustomRecurrenceDate(
  candidateDate: Date,
  baseDate: Date,
  recurrence: ItineraryRecurrence,
) {
  const repeatEvery = Math.max(1, recurrence.repeatEvery ?? 1);
  const frequency = recurrence.frequency ?? "week";

  if (frequency === "day") {
    return (
      differenceInCalendarDays(candidateDate, baseDate) % repeatEvery === 0
    );
  }

  if (frequency === "week") {
    const weekdays =
      recurrence.weekdays && recurrence.weekdays.length > 0
        ? recurrence.weekdays
        : [baseDate.getDay()];

    return (
      weekdays.includes(candidateDate.getDay()) &&
      differenceInCalendarWeeks(
        startOfWeek(candidateDate),
        startOfWeek(baseDate),
      ) %
        repeatEvery ===
        0
    );
  }

  if (frequency === "month") {
    return matchesMonthlyDate(candidateDate, baseDate, repeatEvery);
  }

  return matchesYearlyDate(candidateDate, baseDate, repeatEvery);
}

function matchesMonthlyDate(
  candidateDate: Date,
  baseDate: Date,
  repeatEvery: number,
) {
  return (
    differenceInCalendarMonths(candidateDate, baseDate) % repeatEvery === 0 &&
    candidateDate.getDate() ===
      getClampedDay(
        candidateDate.getFullYear(),
        candidateDate.getMonth(),
        baseDate.getDate(),
      )
  );
}

function matchesYearlyDate(
  candidateDate: Date,
  baseDate: Date,
  repeatEvery: number,
) {
  return (
    differenceInCalendarYears(candidateDate, baseDate) % repeatEvery === 0 &&
    candidateDate.getMonth() === baseDate.getMonth() &&
    candidateDate.getDate() ===
      getClampedDay(
        candidateDate.getFullYear(),
        candidateDate.getMonth(),
        baseDate.getDate(),
      )
  );
}

function getClampedDay(year: number, month: number, day: number) {
  return Math.min(day, new Date(year, month + 1, 0).getDate());
}

function getBaseOccurrenceValues(item: ItineraryItem): OccurrenceValues {
  return {
    allDay: item.allDay,
    category: item.category,
    description: item.description,
    endAt: item.endAt,
    location: item.location,
    startAt: item.startAt,
    title: item.title,
  };
}

function getOccurrenceValues(
  item: ItineraryItem,
  date: Date,
  override?: ItineraryOccurrenceOverride,
): OccurrenceValues {
  const startAt = withTime(date, item.startAt);
  const endAt = new Date(startAt.getTime() + getItemDuration(item));

  return {
    allDay: override?.allDay ?? item.allDay,
    category: override?.category ?? item.category,
    description: override?.description ?? item.description,
    endAt: override?.endAt ?? endAt,
    location: override?.location ?? item.location,
    startAt: override?.startAt ?? startAt,
    title: override?.title ?? item.title,
  };
}

function createCalendarEvent({
  dateKey,
  id,
  isModified,
  item,
  values,
}: {
  dateKey: string | null;
  id: string;
  isModified: boolean;
  item: ItineraryItem;
  values: OccurrenceValues;
}): CalendarEvent {
  return {
    id,
    allDay: values.allDay,
    categoryColor: null,
    categoryId: values.category,
    categoryName: null,
    end: values.endAt,
    isModifiedOccurrence: isModified,
    isRecurring: Boolean(item.recurrence),
    location: values.location,
    occurrenceDateKey: dateKey,
    resource: item,
    seriesId: item.id,
    start: values.startAt,
    title: values.title,
  };
}

function isEventVisible(
  event: CalendarEvent,
  categoryMap: CategoryLookup,
  visibleCategoryIdSet: Set<string>,
  isUncategorizedFilterVisible: boolean,
  range: RecurrenceRange,
) {
  const category = event.categoryId ? categoryMap.get(event.categoryId) : null;

  if (!overlapsRange(event.start, event.end, range)) {
    return false;
  }

  if (!category) {
    return isUncategorizedFilterVisible;
  }

  event.categoryColor = category.color;
  event.categoryName = category.name;

  return visibleCategoryIdSet.has(category.id);
}

function overlapsRange(startAt: Date, endAt: Date, range: RecurrenceRange) {
  return endAt >= range.rangeStart && startAt <= range.rangeEnd;
}

function withTime(date: Date, timeSource: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(
    timeSource.getHours(),
    timeSource.getMinutes(),
    timeSource.getSeconds(),
    timeSource.getMilliseconds(),
  );

  return nextDate;
}

function getItemDuration(item: ItineraryItem) {
  return Math.max(1, item.endAt.getTime() - item.startAt.getTime());
}
