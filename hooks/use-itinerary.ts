"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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

function getItineraryQueryKey(userId?: string) {
  return ["itinerary-items", userId ?? "anonymous"];
}

function sortItineraryItems(items: ItineraryItem[]) {
  return [...items].sort((firstItem, secondItem) => {
    return firstItem.startAt.getTime() - secondItem.startAt.getTime();
  });
}

export function useItinerary() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [hasRealtimeSnapshot, setHasRealtimeSnapshot] = useState(false);
  const [realtimeError, setRealtimeError] = useState<Error | null>(null);
  const queryKey = useMemo(() => getItineraryQueryKey(user?.uid), [user?.uid]);

  const itineraryQuery = useQuery({
    queryKey,
    queryFn: () => getItineraryItems(user?.uid as string),
    enabled: !!user?.uid,
  });

  useEffect(() => {
    if (!user?.uid) {
      setHasRealtimeSnapshot(false);
      setRealtimeError(null);
      queryClient.setQueryData(queryKey, []);
      return;
    }

    setHasRealtimeSnapshot(false);
    setRealtimeError(null);

    const unsubscribe = subscribeToItineraryItems(
      user.uid,
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
  }, [queryClient, queryKey, user?.uid]);

  const createItineraryItemMutation = useMutation({
    mutationFn: async (input: SaveItineraryItemInput) => {
      if (!user?.uid) {
        throw new Error("User is required to create itinerary items.");
      }

      return createItineraryItem({
        ...input,
        userId: user.uid,
      });
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previousItems =
        queryClient.getQueryData<ItineraryItem[]>(queryKey) ?? [];

      if (user?.uid) {
        const optimisticItem: ItineraryItem = {
          ...input,
          id: `optimistic-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: user.uid,
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
    }) => updateItineraryItem(input.itineraryItemId, input.input),
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
    mutationFn: deleteItineraryItem,
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
      itineraryQuery.isLoading || (!!user?.uid && !hasRealtimeSnapshot),
    isUpdatingItineraryItem: updateItineraryItemMutation.isPending,
    updateItineraryItem: updateItineraryItemMutation.mutateAsync,
  };
}
