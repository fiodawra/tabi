"use client";

import { useMemo } from "react";
import type { ItineraryCategory } from "@/services/itinerary-category-service";
import type { ItineraryItem } from "@/services/itinerary-service";
import { toCalendarEvents } from "./itinerary-recurrence";
import { getVisibleCategoryIds, toCategoryMap } from "./itinerary-utils";

type UseItineraryEventsInput = {
  categories: ItineraryCategory[];
  categoryFilterIds?: string[];
  isUncategorizedFilterVisible: boolean;
  itineraryItems: ItineraryItem[];
  rangeEnd: Date;
  rangeStart: Date;
};

export function useItineraryEvents({
  categories,
  categoryFilterIds,
  isUncategorizedFilterVisible,
  itineraryItems,
  rangeEnd,
  rangeStart,
}: UseItineraryEventsInput) {
  const categoryMap = useMemo(() => toCategoryMap(categories), [categories]);
  const visibleCategoryIds = useMemo(
    () => getVisibleCategoryIds(categories, categoryMap, categoryFilterIds),
    [categories, categoryFilterIds, categoryMap],
  );
  const visibleCategoryIdSet = useMemo(
    () => new Set(visibleCategoryIds),
    [visibleCategoryIds],
  );
  const events = useMemo(
    () =>
      toCalendarEvents(
        itineraryItems,
        categoryMap,
        visibleCategoryIdSet,
        isUncategorizedFilterVisible,
        { rangeEnd, rangeStart },
      ),
    [
      categoryMap,
      isUncategorizedFilterVisible,
      itineraryItems,
      rangeEnd,
      rangeStart,
      visibleCategoryIdSet,
    ],
  );

  return {
    categoryMap,
    events,
    visibleCategoryIds,
    visibleCategoryIdSet,
  };
}
