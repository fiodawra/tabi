"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { CalendarSummary } from "@/services/calendar-sharing-service";
import {
  createItineraryItem,
  deleteItineraryItem,
  getItineraryItems,
  type ItineraryItem,
  type SaveItineraryItemInput,
  subscribeToItineraryItems,
  updateItineraryItem,
} from "@/services/itinerary-service";
import { useAuth } from "@/stores/auth-store";

function getItineraryQueryKey(calendarId?: string) {
  return ["itinerary-items", calendarId ?? "anonymous"];
}

function canEditCalendar(calendar?: CalendarSummary | null) {
  return calendar?.access === "owner" || calendar?.access === "editor";
}

function sortItineraryItems(items: ItineraryItem[]) {
  return [...items].sort((firstItem, secondItem) => {
    return firstItem.startAt.getTime() - secondItem.startAt.getTime();
  });
}

export function useItinerary(selectedCalendar?: CalendarSummary | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [hasRealtimeSnapshot, setHasRealtimeSnapshot] = useState(false);
  const [realtimeError, setRealtimeError] = useState<Error | null>(null);
  const calendarId = selectedCalendar?.id;
  const hasCalendarWriteAccess = canEditCalendar(selectedCalendar);
  const queryKey = useMemo(
    () => getItineraryQueryKey(calendarId),
    [calendarId],
  );

  const itineraryQuery = useQuery({
    queryKey,
    queryFn: () => getItineraryItems(calendarId as string),
    enabled: !!user?.uid && !!calendarId,
  });

  useEffect(() => {
    if (!user?.uid || !calendarId) {
      setHasRealtimeSnapshot(false);
      setRealtimeError(null);
      queryClient.setQueryData(queryKey, []);
      return;
    }

    setHasRealtimeSnapshot(false);
    setRealtimeError(null);

    const unsubscribe = subscribeToItineraryItems(
      calendarId,
      (items) => {
        queryClient.setQueryData(queryKey, items);
        setHasRealtimeSnapshot(true);
      },
      (error) => {
        setRealtimeError(error);
        setHasRealtimeSnapshot(true);
      },
    );

    return unsubscribe;
  }, [calendarId, queryClient, queryKey, user?.uid]);

  const createItineraryItemMutation = useMutation({
    mutationFn: async (input: SaveItineraryItemInput) => {
      if (!user?.uid) {
        throw new Error("User is required to create itinerary items.");
      }

      if (!calendarId || !hasCalendarWriteAccess) {
        throw new Error("Calendar write access is required.");
      }

      return createItineraryItem({
        ...input,
        userId: calendarId,
      });
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previousItems =
        queryClient.getQueryData<ItineraryItem[]>(queryKey) ?? [];

      if (calendarId && hasCalendarWriteAccess) {
        const optimisticItem: ItineraryItem = {
          ...input,
          category: input.category ?? null,
          id: `optimistic-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: calendarId,
        };

        queryClient.setQueryData<ItineraryItem[]>(
          queryKey,
          sortItineraryItems([...previousItems, optimisticItem]),
        );
      }

      return { previousItems };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(queryKey, context?.previousItems ?? []);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateItineraryItemMutation = useMutation({
    mutationFn: async (input: {
      input: Partial<SaveItineraryItemInput>;
      itineraryItemId: string;
    }) => {
      if (!hasCalendarWriteAccess) {
        throw new Error("Calendar write access is required.");
      }

      return updateItineraryItem(input.itineraryItemId, input.input);
    },
    onMutate: async ({ input, itineraryItemId }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousItems =
        queryClient.getQueryData<ItineraryItem[]>(queryKey) ?? [];

      queryClient.setQueryData<ItineraryItem[]>(
        queryKey,
        sortItineraryItems(
          previousItems.map((item) =>
            item.id === itineraryItemId
              ? { ...item, ...input, updatedAt: new Date() }
              : item,
          ),
        ),
      );

      return { previousItems };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(queryKey, context?.previousItems ?? []);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteItineraryItemMutation = useMutation({
    mutationFn: async (itineraryItemId: string) => {
      if (!hasCalendarWriteAccess) {
        throw new Error("Calendar write access is required.");
      }

      return deleteItineraryItem(itineraryItemId);
    },
    onMutate: async (itineraryItemId) => {
      await queryClient.cancelQueries({ queryKey });
      const previousItems =
        queryClient.getQueryData<ItineraryItem[]>(queryKey) ?? [];

      queryClient.setQueryData<ItineraryItem[]>(
        queryKey,
        previousItems.filter((item) => item.id !== itineraryItemId),
      );

      return { previousItems };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(queryKey, context?.previousItems ?? []);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    createItineraryItem: createItineraryItemMutation.mutateAsync,
    deleteItineraryItem: deleteItineraryItemMutation.mutateAsync,
    itineraryItems: itineraryQuery.data ?? [],
    itineraryRealtimeError: realtimeError,
    isCreatingItineraryItem: createItineraryItemMutation.isPending,
    isDeletingItineraryItem: deleteItineraryItemMutation.isPending,
    isItineraryLoading:
      itineraryQuery.isLoading ||
      (!!user?.uid && !!calendarId && !hasRealtimeSnapshot),
    isUpdatingItineraryItem: updateItineraryItemMutation.isPending,
    updateItineraryItem: updateItineraryItemMutation.mutateAsync,
  };
}
