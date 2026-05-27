"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  type CalendarRole,
  type CalendarShare,
  type CalendarSummary,
  createCalendarShare,
  deleteCalendarShare,
  getIncomingCalendarShares,
  getOutgoingCalendarShares,
  type ShareCalendarInput,
  subscribeToIncomingCalendarShares,
  subscribeToOutgoingCalendarShares,
  updateCalendarShareRole,
} from "@/services/calendar-sharing-service";
import { useAuth } from "@/stores/auth-store";
import { useItineraryUiStore } from "@/stores/itinerary-ui-store";

function incomingCalendarSharesKey(uid?: string) {
  return ["calendar-shares", "incoming", uid ?? "anonymous"];
}

function outgoingCalendarSharesKey(uid?: string) {
  return ["calendar-shares", "outgoing", uid ?? "anonymous"];
}

function toSharedCalendar(share: CalendarShare): CalendarSummary {
  return {
    id: share.ownerId,
    ownerId: share.ownerId,
    ownerEmail: share.ownerEmail,
    label: share.ownerEmail,
    access: share.role,
    shareId: share.id,
  };
}

export function useCalendars() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const selectedCalendarId = useItineraryUiStore(
    (state) => state.selectedCalendarId,
  );
  const setSelectedCalendarId = useItineraryUiStore(
    (state) => state.setSelectedCalendarId,
  );
  const [incomingRealtimeError, setIncomingRealtimeError] =
    useState<Error | null>(null);
  const [outgoingRealtimeError, setOutgoingRealtimeError] =
    useState<Error | null>(null);
  const incomingQueryKey = useMemo(
    () => incomingCalendarSharesKey(user?.uid),
    [user?.uid],
  );
  const outgoingQueryKey = useMemo(
    () => outgoingCalendarSharesKey(user?.uid),
    [user?.uid],
  );

  const incomingSharesQuery = useQuery({
    queryKey: incomingQueryKey,
    queryFn: () => getIncomingCalendarShares(user?.uid as string),
    enabled: !!user?.uid,
  });
  const outgoingSharesQuery = useQuery({
    queryKey: outgoingQueryKey,
    queryFn: () => getOutgoingCalendarShares(user?.uid as string),
    enabled: !!user?.uid,
  });

  useEffect(() => {
    if (!user?.uid) {
      setIncomingRealtimeError(null);
      queryClient.setQueryData(incomingQueryKey, []);
      return;
    }

    setIncomingRealtimeError(null);

    return subscribeToIncomingCalendarShares(
      user.uid,
      (shares) => {
        queryClient.setQueryData(incomingQueryKey, shares);
      },
      setIncomingRealtimeError,
    );
  }, [incomingQueryKey, queryClient, user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setOutgoingRealtimeError(null);
      queryClient.setQueryData(outgoingQueryKey, []);
      return;
    }

    setOutgoingRealtimeError(null);

    return subscribeToOutgoingCalendarShares(
      user.uid,
      (shares) => {
        queryClient.setQueryData(outgoingQueryKey, shares);
      },
      setOutgoingRealtimeError,
    );
  }, [outgoingQueryKey, queryClient, user?.uid]);

  const ownCalendar = useMemo<CalendarSummary | null>(() => {
    if (!user?.uid) {
      return null;
    }

    return {
      id: user.uid,
      ownerId: user.uid,
      ownerEmail: user.email ?? "",
      label: user.displayName ?? user.email ?? "",
      access: "owner",
    };
  }, [user?.displayName, user?.email, user?.uid]);

  const incomingShares = incomingSharesQuery.data ?? [];
  const outgoingShares = outgoingSharesQuery.data ?? [];
  const calendars = useMemo<CalendarSummary[]>(() => {
    if (!ownCalendar) {
      return [];
    }

    return [ownCalendar, ...incomingShares.map(toSharedCalendar)];
  }, [incomingShares, ownCalendar]);
  const selectedCalendar =
    calendars.find((calendar) => calendar.id === selectedCalendarId) ??
    ownCalendar;
  const isCalendarsLoading =
    incomingSharesQuery.isLoading || outgoingSharesQuery.isLoading;

  useEffect(() => {
    if (
      !user?.uid ||
      isCalendarsLoading ||
      !selectedCalendarId ||
      calendars.some((calendar) => calendar.id === selectedCalendarId)
    ) {
      return;
    }

    setSelectedCalendarId(user.uid);
  }, [
    calendars,
    isCalendarsLoading,
    selectedCalendarId,
    setSelectedCalendarId,
    user?.uid,
  ]);

  const shareCalendarMutation = useMutation({
    mutationFn: async (input: ShareCalendarInput) => {
      if (!user?.uid) {
        throw new Error("User is required to share a calendar.");
      }

      return createCalendarShare({
        ...input,
        ownerId: user.uid,
        ownerEmail: user.email ?? "",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: outgoingQueryKey });
    },
  });
  const updateCalendarShareRoleMutation = useMutation({
    mutationFn: async (input: { role: CalendarRole; shareId: string }) =>
      updateCalendarShareRole(input.shareId, input.role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: outgoingQueryKey });
    },
  });
  const revokeCalendarShareMutation = useMutation({
    mutationFn: deleteCalendarShare,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: outgoingQueryKey });
    },
  });

  return {
    calendars,
    incomingCalendarShares: incomingShares,
    outgoingCalendarShares: outgoingShares,
    selectedCalendar,
    selectedCalendarId: selectedCalendar?.id ?? null,
    setSelectedCalendarId,
    shareCalendar: shareCalendarMutation.mutateAsync,
    updateCalendarShareRole: updateCalendarShareRoleMutation.mutateAsync,
    revokeCalendarShare: revokeCalendarShareMutation.mutateAsync,
    calendarsRealtimeError: incomingRealtimeError ?? outgoingRealtimeError,
    isCalendarsLoading,
    isSharingCalendar: shareCalendarMutation.isPending,
    isUpdatingCalendarShareRole: updateCalendarShareRoleMutation.isPending,
    isRevokingCalendarShare: revokeCalendarShareMutation.isPending,
  };
}
