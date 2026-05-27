"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { CalendarSummary } from "@/services/calendar-sharing-service";
import {
  createItineraryCategory,
  deleteItineraryCategory,
  getItineraryCategories,
  type ItineraryCategory,
  type SaveItineraryCategoryInput,
  subscribeToItineraryCategories,
  updateItineraryCategory,
} from "@/services/itinerary-category-service";
import { useAuth } from "@/stores/auth-store";

function itineraryCategoriesKey(calendarId?: string) {
  return ["itinerary-categories", calendarId ?? "anonymous"];
}

function canEditCalendar(calendar?: CalendarSummary | null) {
  return calendar?.access === "owner" || calendar?.access === "editor";
}

export function useItineraryCategories(
  selectedCalendar?: CalendarSummary | null,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [realtimeError, setRealtimeError] = useState<Error | null>(null);
  const calendarId = selectedCalendar?.id;
  const hasCalendarWriteAccess = canEditCalendar(selectedCalendar);
  const queryKey = useMemo(
    () => itineraryCategoriesKey(calendarId),
    [calendarId],
  );

  const categoriesQuery = useQuery({
    queryKey,
    queryFn: () => getItineraryCategories(calendarId as string),
    enabled: !!user?.uid && !!calendarId,
  });

  useEffect(() => {
    if (!user?.uid || !calendarId) {
      setRealtimeError(null);
      queryClient.setQueryData(queryKey, []);
      return;
    }

    setRealtimeError(null);

    return subscribeToItineraryCategories(
      calendarId,
      (categories) => {
        queryClient.setQueryData(queryKey, categories);
      },
      setRealtimeError,
    );
  }, [calendarId, queryClient, queryKey, user?.uid]);

  const createCategoryMutation = useMutation({
    mutationFn: async (input: SaveItineraryCategoryInput) => {
      if (!calendarId || !hasCalendarWriteAccess) {
        throw new Error("Calendar write access is required.");
      }

      return createItineraryCategory(calendarId, input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });
  const updateCategoryMutation = useMutation({
    mutationFn: async (
      input: SaveItineraryCategoryInput & { categoryId: string },
    ) => {
      if (!hasCalendarWriteAccess) {
        throw new Error("Calendar write access is required.");
      }

      return updateItineraryCategory(input.categoryId, input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      if (!hasCalendarWriteAccess) {
        throw new Error("Calendar write access is required.");
      }

      return deleteItineraryCategory(categoryId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    categories: (categoriesQuery.data ?? []) as ItineraryCategory[],
    categoriesRealtimeError: realtimeError,
    createCategory: createCategoryMutation.mutateAsync,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    isCategoriesLoading: categoriesQuery.isLoading,
    isCreatingCategory: createCategoryMutation.isPending,
    isDeletingCategory: deleteCategoryMutation.isPending,
    isUpdatingCategory: updateCategoryMutation.isPending,
    updateCategory: updateCategoryMutation.mutateAsync,
  };
}
