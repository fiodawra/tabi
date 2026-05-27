"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  type CalendarRole,
  type CalendarShare,
  type CalendarSummary,
  createCalendarShare,
  createUserCalendar,
  deleteCalendarShare,
  deleteUserCalendar,
  getIncomingCalendarShares,
  getOutgoingCalendarShares,
  getUserCalendars,
  type SaveUserCalendarInput,
  type ShareCalendarInput,
  subscribeToIncomingCalendarShares,
  subscribeToOutgoingCalendarShares,
  subscribeToUserCalendars,
  type UserCalendar,
  updateCalendarShareRole,
  updateUserCalendar,
} from "@/services/calendar-sharing-service";
import { useAuth } from "@/stores/auth-store";
import { useItineraryUiStore } from "@/stores/itinerary-ui-store";

function incomingCalendarSharesKey(uid?: string) {
  return ["calendar-shares", "incoming", uid ?? "anonymous"];
}

function outgoingCalendarSharesKey(uid?: string) {
  return ["calendar-shares", "outgoing", uid ?? "anonymous"];
}

function ownedCalendarsKey(uid?: string) {
  return ["calendars", "owned", uid ?? "anonymous"];
}

function toSharedCalendar(share: CalendarShare): CalendarSummary {
  return {
    id: share.calendarId,
    ownerId: share.ownerId,
    ownerEmail: share.ownerEmail,
    label: share.calendarTitle || share.calendarLabel || share.ownerEmail,
    description: share.calendarDescription,
    access: share.role,
    shareId: share.id,
  };
}

function toOwnedCalendar(
  calendar: UserCalendar,
  ownerEmail: string,
): CalendarSummary {
  return {
    id: calendar.id,
    ownerId: calendar.ownerId,
    ownerEmail,
    label: calendar.title,
    description: calendar.description,
    archivedAt: calendar.archivedAt,
    access: "owner",
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
  const [ownedCalendarsRealtimeError, setOwnedCalendarsRealtimeError] =
    useState<Error | null>(null);
  const incomingQueryKey = useMemo(
    () => incomingCalendarSharesKey(user?.uid),
    [user?.uid],
  );
  const outgoingQueryKey = useMemo(
    () => outgoingCalendarSharesKey(user?.uid),
    [user?.uid],
  );
  const ownedCalendarsQueryKey = useMemo(
    () => ownedCalendarsKey(user?.uid),
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
  const ownedCalendarsQuery = useQuery({
    queryKey: ownedCalendarsQueryKey,
    queryFn: () => getUserCalendars(user?.uid as string),
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

  useEffect(() => {
    if (!user?.uid) {
      setOwnedCalendarsRealtimeError(null);
      queryClient.setQueryData(ownedCalendarsQueryKey, []);
      return;
    }

    setOwnedCalendarsRealtimeError(null);

    return subscribeToUserCalendars(
      user.uid,
      (calendars) => {
        queryClient.setQueryData(ownedCalendarsQueryKey, calendars);
      },
      setOwnedCalendarsRealtimeError,
    );
  }, [ownedCalendarsQueryKey, queryClient, user?.uid]);

  const incomingShares = incomingSharesQuery.data ?? [];
  const outgoingShares = outgoingSharesQuery.data ?? [];
  const ownedCalendars = ownedCalendarsQuery.data ?? [];
  const ownedCalendarSummaries = useMemo(
    () =>
      ownedCalendars.map((calendar) =>
        toOwnedCalendar(calendar, user?.email ?? ""),
      ),
    [ownedCalendars, user?.email],
  );
  const archivedCalendars = useMemo(
    () => ownedCalendarSummaries.filter((calendar) => calendar.archivedAt),
    [ownedCalendarSummaries],
  );
  const calendars = useMemo<CalendarSummary[]>(() => {
    return [
      ...ownedCalendarSummaries.filter((calendar) => !calendar.archivedAt),
      ...incomingShares.map(toSharedCalendar),
    ];
  }, [incomingShares, ownedCalendarSummaries]);
  const selectedCalendar =
    calendars.find((calendar) => calendar.id === selectedCalendarId) ?? null;
  const isCalendarsLoading =
    incomingSharesQuery.isLoading ||
    outgoingSharesQuery.isLoading ||
    ownedCalendarsQuery.isLoading;
  const selectedCalendarOutgoingShares = outgoingShares.filter(
    (share) => share.calendarId === selectedCalendar?.id,
  );

  useEffect(() => {
    if (
      !user?.uid ||
      isCalendarsLoading ||
      (selectedCalendarId &&
        calendars.some((calendar) => calendar.id === selectedCalendarId))
    ) {
      return;
    }

    setSelectedCalendarId(calendars.at(0)?.id ?? null);
  }, [
    calendars,
    isCalendarsLoading,
    selectedCalendarId,
    setSelectedCalendarId,
    user?.uid,
  ]);

  const shareCalendarMutation = useMutation({
    mutationFn: async (
      input: Omit<
        ShareCalendarInput,
        "calendarDescription" | "calendarId" | "calendarLabel" | "calendarTitle"
      >,
    ) => {
      if (
        !user?.uid ||
        !selectedCalendar ||
        selectedCalendar.access !== "owner"
      ) {
        throw new Error("User is required to share a calendar.");
      }

      return createCalendarShare({
        ...input,
        calendarDescription: selectedCalendar.description,
        calendarId: selectedCalendar.id,
        calendarLabel: selectedCalendar.label,
        calendarTitle: selectedCalendar.label,
        ownerId: user.uid,
        ownerEmail: user.email ?? "",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: outgoingQueryKey });
    },
  });
  const createCalendarMutation = useMutation({
    mutationFn: async (input: SaveUserCalendarInput) => {
      if (!user?.uid) {
        throw new Error("User is required to create calendars.");
      }

      return createUserCalendar(user.uid, input);
    },
    onSuccess: async (calendarId) => {
      setSelectedCalendarId(calendarId);
      await queryClient.invalidateQueries({ queryKey: ownedCalendarsQueryKey });
    },
  });
  const updateCalendarMutation = useMutation({
    mutationFn: async (input: SaveUserCalendarInput & { calendarId: string }) =>
      updateUserCalendar(input.calendarId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ownedCalendarsQueryKey });
      await queryClient.invalidateQueries({ queryKey: outgoingQueryKey });
    },
  });
  const deleteCalendarMutation = useMutation({
    mutationFn: deleteUserCalendar,
    onSuccess: async (_data, calendarId) => {
      if (selectedCalendarId === calendarId) {
        setSelectedCalendarId(
          calendars.find((calendar) => calendar.id !== calendarId)?.id ?? null,
        );
      }
      await queryClient.invalidateQueries({ queryKey: ownedCalendarsQueryKey });
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
    archivedCalendars,
    createCalendar: createCalendarMutation.mutateAsync,
    incomingCalendarShares: incomingShares,
    isCreatingCalendar: createCalendarMutation.isPending,
    outgoingCalendarShares: outgoingShares,
    selectedCalendarOutgoingShares,
    selectedCalendar,
    selectedCalendarId: selectedCalendar?.id ?? null,
    setSelectedCalendarId,
    updateCalendar: updateCalendarMutation.mutateAsync,
    deleteCalendar: deleteCalendarMutation.mutateAsync,
    shareCalendar: shareCalendarMutation.mutateAsync,
    updateCalendarShareRole: updateCalendarShareRoleMutation.mutateAsync,
    revokeCalendarShare: revokeCalendarShareMutation.mutateAsync,
    calendarsRealtimeError:
      incomingRealtimeError ??
      outgoingRealtimeError ??
      ownedCalendarsRealtimeError,
    isCalendarsLoading,
    isDeletingCalendar: deleteCalendarMutation.isPending,
    isSharingCalendar: shareCalendarMutation.isPending,
    isUpdatingCalendar: updateCalendarMutation.isPending,
    isUpdatingCalendarShareRole: updateCalendarShareRoleMutation.isPending,
    isRevokingCalendarShare: revokeCalendarShareMutation.isPending,
  };
}
