import { isSameDay } from "date-fns";
import {
  CalendarShareError,
  type CalendarSummary,
} from "@/services/calendar-sharing-service";
import {
  type ItineraryCategory,
  ItineraryCategoryError,
} from "@/services/itinerary-category-service";
import type { ItineraryItem } from "@/services/itinerary-service";
import type {
  CalendarEvent,
  CategoryLookup,
  ItineraryDraft,
  TranslationFn,
} from "./itinerary-types";

export function readStoredDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function addHours(date: Date, hours: number) {
  const nextDate = new Date(date);
  nextDate.setHours(nextDate.getHours() + hours);

  return nextDate;
}

export function getCalendarLabel(calendar: CalendarSummary, t: TranslationFn) {
  return calendar.label || calendar.ownerEmail || t("calendarSelector.shared");
}

export function getCalendarDetail(calendar: CalendarSummary, t: TranslationFn) {
  if (calendar.access === "owner") {
    return calendar.ownerEmail || t("calendarSelector.owner");
  }

  return t(`access.${calendar.access}`);
}

export function getShareErrorMessage(error: unknown, t: TranslationFn) {
  if (error instanceof CalendarShareError) {
    return t(`share.errors.${error.code}`);
  }

  return t("share.errors.generic");
}

export function getCalendarErrorMessage(error: unknown, t: TranslationFn) {
  if (error instanceof CalendarShareError) {
    return t(`calendarManager.errors.${error.code}`);
  }

  return t("calendarManager.errors.generic");
}

export function getCategoryErrorMessage(error: unknown, t: TranslationFn) {
  if (error instanceof ItineraryCategoryError) {
    return t(`categoryManager.errors.${error.code}`);
  }

  return t("categoryManager.errors.generic");
}

export function getReadableTextColor(color: string | null) {
  if (!color?.startsWith("#") || color.length !== 7) {
    return "var(--background)";
  }

  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.66 ? "var(--foreground)" : "var(--background)";
}

export function createStartDateForSelection(selectedDate: Date) {
  const now = new Date();
  const startAt = new Date(selectedDate);

  if (isSameDay(startAt, now)) {
    startAt.setHours(now.getHours() + 1, 0, 0, 0);
    return startAt;
  }

  startAt.setHours(9, 0, 0, 0);
  return startAt;
}

export function createDraftFromDates(startAt: Date, endAt: Date) {
  return {
    allDay: false,
    category: null,
    description: "",
    endAt,
    location: "",
    startAt,
    title: "",
  } satisfies ItineraryDraft;
}

export function createDraftFromItem(item: ItineraryItem) {
  return {
    id: item.id,
    allDay: item.allDay,
    category: item.category,
    description: item.description,
    endAt: item.endAt,
    location: item.location,
    startAt: item.startAt,
    title: item.title,
  } satisfies ItineraryDraft;
}

export function toCategoryMap(categories: ItineraryCategory[]) {
  return new Map(categories.map((category) => [category.id, category]));
}

export function getVisibleCategoryIds(
  categories: ItineraryCategory[],
  categoryMap: CategoryLookup,
  categoryFilterIds?: string[],
) {
  return (
    categoryFilterIds?.filter((categoryId) => categoryMap.has(categoryId)) ??
    categories.map((category) => category.id)
  );
}

export function toCalendarEvents(
  itineraryItems: ItineraryItem[],
  categoryMap: CategoryLookup,
  visibleCategoryIdSet: Set<string>,
  isUncategorizedFilterVisible: boolean,
) {
  return itineraryItems
    .filter((item) => {
      const category = item.category ? categoryMap.get(item.category) : null;

      if (!category) {
        return isUncategorizedFilterVisible;
      }

      return visibleCategoryIdSet.has(category.id);
    })
    .map((item): CalendarEvent => {
      const category = item.category ? categoryMap.get(item.category) : null;

      return {
        id: item.id,
        allDay: item.allDay,
        categoryColor: category?.color ?? null,
        categoryId: category?.id ?? null,
        categoryName: category?.name ?? null,
        end: item.endAt,
        location: item.location,
        resource: item,
        start: item.startAt,
        title: item.title,
      };
    });
}
