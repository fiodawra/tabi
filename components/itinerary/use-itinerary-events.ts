"use client";

import { useMemo } from "react";
import type { ItineraryCategory } from "@/services/itinerary-category-service";
import type { ItineraryItem } from "@/services/itinerary-service";
import {
  getVisibleCategoryIds,
  toCalendarEvents,
  toCategoryMap,
} from "./itinerary-utils";

type UseItineraryEventsInput = {
  categories: ItineraryCategory[];
  categoryFilterIds?: string[];
  isUncategorizedFilterVisible: boolean;
  itineraryItems: ItineraryItem[];
};

export function useItineraryEvents({
  categories,
  categoryFilterIds,
  isUncategorizedFilterVisible,
  itineraryItems,
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
      ),
    [
      categoryMap,
      isUncategorizedFilterVisible,
      itineraryItems,
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
