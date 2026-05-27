import type { ItineraryCategory } from "@/services/itinerary-category-service";
import type { ItineraryItem } from "@/services/itinerary-service";

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
  location: string;
  resource: ItineraryItem;
  start: Date;
  title: string;
};

export type ItineraryDraft = {
  allDay: boolean;
  category: string | null;
  description: string;
  endAt: Date;
  id?: string;
  location: string;
  startAt: Date;
  title: string;
};

export type CategoryLookup = Map<string, ItineraryCategory>;
