import type { ItineraryCategory } from "@/services/itinerary-category-service";
import type {
  ItineraryItem,
  ItineraryRecurrence,
} from "@/services/itinerary-service";

export type TranslationFn = (
  key: string,
  values?: Record<string, number | string>,
) => string;

export type CalendarEvent = {
  allDay: boolean;
  categoryColor: string | null;
  categoryId: string | null;
  categoryName: string | null;
  end: Date;
  id: string;
  isModifiedOccurrence: boolean;
  isRecurring: boolean;
  location: string;
  occurrenceDateKey: string | null;
  resource: ItineraryItem;
  seriesId: string;
  start: Date;
  title: string;
};

export type ItineraryDraft = {
  allDay: boolean;
  category: string | null;
  description: string;
  endAt: Date;
  id?: string;
  isRecurring: boolean;
  location: string;
  occurrenceDateKey?: string | null;
  recurrence: ItineraryRecurrence | null;
  seriesItem?: ItineraryItem;
  startAt: Date;
  title: string;
};

export type CategoryLookup = Map<string, ItineraryCategory>;
