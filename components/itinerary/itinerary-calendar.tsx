"use client";

import { type CSSProperties, useCallback, useMemo, useState } from "react";
import { type SlotInfo, type ToolbarProps, Views } from "react-big-calendar";
import type { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalendars } from "@/hooks/use-calendars";
import { useLocale, useTranslations } from "@/hooks/use-i18n";
import { useItinerary } from "@/hooks/use-itinerary";
import { useItineraryCategories } from "@/hooks/use-itinerary-categories";
import { useRealtimeErrorToast } from "@/hooks/use-realtime-error-toast";
import { useToastOperation } from "@/hooks/use-toast-operation";
import { cn } from "@/lib/utils";
import type {
  CalendarRole,
  CalendarSummary,
} from "@/services/calendar-sharing-service";
import type { SaveItineraryItemInput } from "@/services/itinerary-service";
import { useItineraryUiStore } from "@/stores/itinerary-ui-store";
import { CalendarEventContent } from "./calendar-event-content";
import { CalendarManagerDialog } from "./calendar-manager-dialog";
import { CalendarShareDialog } from "./calendar-share-dialog";
import "./itinerary-calendar.css";
import {
  CALENDAR_VIEWS,
  DEFAULT_EVENT_COLOR,
  DragAndDropCalendar,
  localizer,
  TIMESLOTS_BY_STEP,
} from "./itinerary-constants";
import { NoCalendarEmptyState } from "./itinerary-empty-state";
import { ItineraryItemDialog } from "./itinerary-item-dialog";
import { ItineraryRealtimeAlert } from "./itinerary-realtime-alert";
import { getCalendarExpansionRange } from "./itinerary-recurrence";
import { useRegisterItinerarySidebarActions } from "./itinerary-sidebar-actions";
import { ItineraryToolbar } from "./itinerary-toolbar";
import type { CalendarEvent, ItineraryDraft } from "./itinerary-types";
import {
  addHours,
  createDraftFromDates,
  createDraftFromEvent,
  createStartDateForSelection,
  getCalendarDetail,
  getCalendarErrorMessage,
  getReadableTextColor,
  getShareErrorMessage,
  readStoredDate,
} from "./itinerary-utils";
import { useItineraryEvents } from "./use-itinerary-events";

type ItineraryCalendarStyle = CSSProperties & {
  "--itinerary-timeslots-per-hour": number;
};

type PendingRecurringAction =
  | {
      input: SaveItineraryItemInput;
      kind: "save";
    }
  | {
      kind: "delete";
    }
  | {
      event: CalendarEvent;
      input: Partial<SaveItineraryItemInput>;
      kind: "time";
    };

type RecurringActionScope = "one" | "all";

export function ItineraryCalendar() {
  const t = useTranslations("ItineraryPage");
  const locale = useLocale();
  const runToastOperation = useToastOperation();
  const {
    calendars,
    archivedCalendars,
    calendarsRealtimeError,
    createCalendar,
    deleteCalendar,
    isCreatingCalendar,
    isDeletingCalendar,
    isRevokingCalendarShare,
    isSharingCalendar,
    isUpdatingCalendar,
    isUpdatingCalendarShareRole,
    revokeCalendarShare,
    selectedCalendar,
    selectedCalendarId,
    selectedCalendarOutgoingShares,
    shareCalendar,
    updateCalendar,
    updateCalendarShareRole,
  } = useCalendars();
  const {
    createItineraryItem,
    deleteItineraryOccurrence,
    deleteItineraryItem,
    itineraryItems,
    itineraryRealtimeError,
    isCreatingItineraryItem,
    isDeletingItineraryOccurrence,
    isDeletingItineraryItem,
    isItineraryLoading,
    isUpdatingItineraryOccurrence,
    isUpdatingItineraryItem,
    updateItineraryOccurrence,
    updateItineraryItem,
  } = useItinerary(selectedCalendar);
  const { categories } = useItineraryCategories(selectedCalendar);
  const calendarView = useItineraryUiStore((state) => state.calendarView);
  const categoryFilterIds = useItineraryUiStore((state) =>
    selectedCalendarId
      ? state.categoryFiltersByCalendarId[selectedCalendarId]
      : undefined,
  );
  const isUncategorizedFilterVisible = useItineraryUiStore((state) =>
    selectedCalendarId
      ? (state.uncategorizedFiltersByCalendarId[selectedCalendarId] ?? true)
      : true,
  );
  const selectedDateValue = useItineraryUiStore((state) => state.selectedDate);
  const setCalendarView = useItineraryUiStore((state) => state.setCalendarView);
  const setSelectedDate = useItineraryUiStore((state) => state.setSelectedDate);
  const setTimeGridStep = useItineraryUiStore((state) => state.setTimeGridStep);
  const timeGridStep = useItineraryUiStore((state) => state.timeGridStep);
  const selectedDate = useMemo(
    () => readStoredDate(selectedDateValue),
    [selectedDateValue],
  );
  const eventRange = useMemo(
    () => getCalendarExpansionRange(calendarView, selectedDate),
    [calendarView, selectedDate],
  );
  const calendarStyle = useMemo<ItineraryCalendarStyle>(
    () => ({
      "--itinerary-timeslots-per-hour": TIMESLOTS_BY_STEP[timeGridStep],
    }),
    [timeGridStep],
  );
  const { categoryMap, events } = useItineraryEvents({
    categories,
    categoryFilterIds,
    isUncategorizedFilterVisible,
    itineraryItems,
    rangeEnd: eventRange.rangeEnd,
    rangeStart: eventRange.rangeStart,
  });
  const [draft, setDraft] = useState<ItineraryDraft>(() => {
    const startAt = createStartDateForSelection(selectedDate);
    return createDraftFromDates(startAt, addHours(startAt, 1));
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [calendarDescription, setCalendarDescription] = useState("");
  const [calendarTitle, setCalendarTitle] = useState("");
  const [editingCalendarId, setEditingCalendarId] = useState<string | null>(
    null,
  );
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareRole, setShareRole] = useState<CalendarRole>("viewer");
  const [formError, setFormError] = useState("");
  const [pendingRecurringAction, setPendingRecurringAction] =
    useState<PendingRecurringAction | null>(null);
  const canEditSelectedCalendar =
    selectedCalendar?.access === "owner" ||
    selectedCalendar?.access === "editor";
  const ownedCalendars = calendars.filter(
    (calendar) => calendar.access === "owner",
  );
  const selectedCalendarDetail = selectedCalendar
    ? getCalendarDetail(selectedCalendar, t)
    : "";
  const isSaving =
    isCreatingItineraryItem ||
    isUpdatingItineraryItem ||
    isUpdatingItineraryOccurrence;
  const isDeleting = isDeletingItineraryItem || isDeletingItineraryOccurrence;
  const isSavingCalendar = isCreatingCalendar || isUpdatingCalendar;
  const hasActiveCalendars = calendars.length > 0;

  useRealtimeErrorToast(itineraryRealtimeError, "itineraryRealtimeFailed");
  useRealtimeErrorToast(
    calendarsRealtimeError,
    "calendarSharingRealtimeFailed",
  );

  const resetCalendarForm = useCallback(() => {
    setCalendarDescription("");
    setCalendarTitle("");
    setEditingCalendarId(null);
    setCalendarError("");
  }, []);

  const openCreateDialog = useCallback(() => {
    if (!canEditSelectedCalendar) {
      return;
    }

    const startAt = createStartDateForSelection(selectedDate);
    setDraft(createDraftFromDates(startAt, addHours(startAt, 1)));
    setFormError("");
    setDialogOpen(true);
  }, [canEditSelectedCalendar, selectedDate]);

  const openEditDialog = useCallback((event: CalendarEvent) => {
    setDraft(createDraftFromEvent(event));
    setFormError("");
    setDialogOpen(true);
  }, []);

  const openSlotDialog = useCallback(
    (slotInfo: SlotInfo) => {
      if (!canEditSelectedCalendar) {
        return;
      }

      setDraft({
        ...createDraftFromDates(slotInfo.start, slotInfo.end),
        allDay: calendarView === Views.MONTH,
      });
      setFormError("");
      setDialogOpen(true);
    },
    [calendarView, canEditSelectedCalendar],
  );

  const openCalendarDialog = useCallback(() => {
    resetCalendarForm();
    setCalendarDialogOpen(true);
  }, [resetCalendarForm]);

  const openShareDialog = useCallback(() => {
    setShareError("");
    setShareDialogOpen(true);
  }, []);

  const sidebarActions = useMemo(
    () => ({
      onCreateItem: openCreateDialog,
      onOpenCalendarDialog: openCalendarDialog,
      onOpenShareDialog: openShareDialog,
    }),
    [openCalendarDialog, openCreateDialog, openShareDialog],
  );

  useRegisterItinerarySidebarActions(sidebarActions);

  const components = useMemo(
    () => ({
      event: CalendarEventContent,
      toolbar: (toolbarProps: ToolbarProps<CalendarEvent>) => (
        <ItineraryToolbar
          {...toolbarProps}
          selectedCalendarDetail={selectedCalendarDetail}
          setTimeGridStep={setTimeGridStep}
          t={t}
          timeGridStep={timeGridStep}
        />
      ),
    }),
    [selectedCalendarDetail, setTimeGridStep, t, timeGridStep],
  );

  const messages = useMemo(
    () => ({
      agenda: t("views.agenda"),
      allDay: t("allDay"),
      date: t("agenda.date"),
      day: t("views.day"),
      event: t("agenda.event"),
      month: t("views.month"),
      next: t("toolbar.next"),
      noEventsInRange: t("emptyRange"),
      previous: t("toolbar.previous"),
      showMore: (total: number) => t("showMore", { count: total }),
      time: t("agenda.time"),
      today: t("toolbar.today"),
      week: t("views.week"),
      work_week: t("views.work_week"),
    }),
    [t],
  );

  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const backgroundColor = event.categoryColor ?? DEFAULT_EVENT_COLOR;

    return {
      className: "tabi-calendar-event",
      style: {
        backgroundColor,
        color: getReadableTextColor(event.categoryColor),
      },
    };
  }, []);

  function getSeriesUpdateInput(input: SaveItineraryItemInput) {
    if (input.recurrence) {
      return input;
    }

    return {
      ...input,
      deletedOccurrenceDates: [],
      modifiedOccurrences: {},
      recurrence: null,
    };
  }

  function getEventSaveInput(
    event: CalendarEvent,
    input: Partial<SaveItineraryItemInput> = {},
  ): SaveItineraryItemInput {
    const occurrenceOverride =
      event.resource.modifiedOccurrences[event.occurrenceDateKey ?? ""];

    return {
      allDay: input.allDay ?? event.allDay,
      category: input.category ?? event.categoryId,
      description:
        input.description ??
        occurrenceOverride?.description ??
        event.resource.description,
      endAt: input.endAt ?? event.end,
      location: input.location ?? event.location,
      startAt: input.startAt ?? event.start,
      title: input.title ?? event.title,
    };
  }

  function isRecurringDraftAction() {
    return Boolean(
      draft.isRecurring && draft.seriesItem && draft.occurrenceDateKey,
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canEditSelectedCalendar) {
      return;
    }

    if (!draft.title.trim()) {
      setFormError(t("validation.titleRequired"));
      return;
    }

    if (
      Number.isNaN(draft.startAt.getTime()) ||
      Number.isNaN(draft.endAt.getTime()) ||
      draft.endAt <= draft.startAt
    ) {
      setFormError(t("validation.endAfterStart"));
      return;
    }

    if (
      draft.recurrence?.preset === "custom" &&
      draft.recurrence.end.mode === "onDate" &&
      Number.isNaN(draft.recurrence.end.date.getTime())
    ) {
      setFormError(t("validation.recurrenceEndDateRequired"));
      return;
    }

    const input: SaveItineraryItemInput = {
      allDay: draft.allDay,
      category:
        draft.category && categoryMap.has(draft.category)
          ? draft.category
          : null,
      description: draft.description.trim(),
      endAt: draft.endAt,
      location: draft.location.trim(),
      recurrence: draft.recurrence,
      startAt: draft.startAt,
      title: draft.title.trim(),
    };
    const isEditing = Boolean(draft.id);

    if (isEditing && isRecurringDraftAction()) {
      setPendingRecurringAction({ input, kind: "save" });
      return;
    }

    void runToastOperation(
      async () => {
        if (isEditing && draft.id) {
          await updateItineraryItem({
            itineraryItemId: draft.id,
            input: getSeriesUpdateInput(input),
          });
          return;
        }

        await createItineraryItem(input);
      },
      {
        error: isEditing ? "itineraryUpdateFailed" : "itineraryCreateFailed",
        success: isEditing
          ? "itineraryUpdateSuccess"
          : "itineraryCreateSuccess",
        onSuccess: () => setDialogOpen(false),
      },
    ).catch(() => undefined);
  }

  function handleDelete() {
    if (!draft.id || !canEditSelectedCalendar) {
      return;
    }

    if (isRecurringDraftAction()) {
      setPendingRecurringAction({ kind: "delete" });
      return;
    }

    void runToastOperation(() => deleteItineraryItem(draft.id as string), {
      error: "itineraryDeleteFailed",
      success: "itineraryDeleteSuccess",
      onSuccess: () => setDialogOpen(false),
    }).catch(() => undefined);
  }

  function handleEventTimeChange({
    end,
    event,
    isAllDay,
    start,
  }: EventInteractionArgs<CalendarEvent>) {
    if (!canEditSelectedCalendar) {
      return;
    }

    const input = {
      // DnD from the all-day row into the time grid omits `isAllDay`.
      // In that case this is a timed event update, so force `allDay=false`.
      allDay: typeof isAllDay === "boolean" ? isAllDay : false,
      endAt: new Date(end),
      startAt: new Date(start),
    };

    if (event.isRecurring && event.occurrenceDateKey) {
      setPendingRecurringAction({
        event,
        input,
        kind: "time",
      });
      return;
    }

    void runToastOperation(
      () =>
        updateItineraryItem({
          itineraryItemId: event.seriesId,
          input,
        }),
      {
        error: "itineraryUpdateFailed",
        success: false,
      },
    ).catch(() => undefined);
  }

  function handleRecurringActionScope(scope: RecurringActionScope) {
    if (!pendingRecurringAction) {
      return;
    }

    const pendingAction = pendingRecurringAction;

    void runToastOperation(
      async () => {
        if (pendingAction.kind === "save") {
          if (scope === "one" && draft.seriesItem && draft.occurrenceDateKey) {
            await updateItineraryOccurrence({
              input: pendingAction.input,
              itineraryItem: draft.seriesItem,
              occurrenceDateKey: draft.occurrenceDateKey,
            });
            return;
          }

          if (draft.id) {
            await updateItineraryItem({
              itineraryItemId: draft.id,
              input: getSeriesUpdateInput(pendingAction.input),
            });
          }
          return;
        }

        if (pendingAction.kind === "delete") {
          if (scope === "one" && draft.seriesItem && draft.occurrenceDateKey) {
            await deleteItineraryOccurrence({
              itineraryItem: draft.seriesItem,
              occurrenceDateKey: draft.occurrenceDateKey,
            });
            return;
          }

          if (draft.id) {
            await deleteItineraryItem(draft.id);
          }
          return;
        }

        if (scope === "one" && pendingAction.event.occurrenceDateKey) {
          await updateItineraryOccurrence({
            input: getEventSaveInput(pendingAction.event, pendingAction.input),
            itineraryItem: pendingAction.event.resource,
            occurrenceDateKey: pendingAction.event.occurrenceDateKey,
          });
          return;
        }

        await updateItineraryItem({
          itineraryItemId: pendingAction.event.seriesId,
          input: pendingAction.input,
        });
      },
      {
        error:
          pendingAction.kind === "delete"
            ? "itineraryDeleteFailed"
            : "itineraryUpdateFailed",
        success:
          pendingAction.kind === "time"
            ? false
            : pendingAction.kind === "delete"
              ? "itineraryDeleteSuccess"
              : "itineraryUpdateSuccess",
        onSuccess: () => {
          if (
            pendingAction.kind === "save" ||
            pendingAction.kind === "delete"
          ) {
            setDialogOpen(false);
          }
        },
      },
    )
      .catch(() => undefined)
      .finally(() => setPendingRecurringAction(null));
  }

  function handleShareSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShareError("");

    void runToastOperation(
      () =>
        shareCalendar({
          recipientEmail: shareEmail,
          role: shareRole,
        }),
      {
        error: "calendarShareFailed",
        success: "calendarShareSuccess",
        onError: (error) => setShareError(getShareErrorMessage(error, t)),
        onSuccess: () => {
          setShareEmail("");
          setShareRole("viewer");
        },
      },
    ).catch(() => undefined);
  }

  function handleCalendarSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCalendarError("");
    const isEditing = Boolean(editingCalendarId);

    void runToastOperation(
      async () => {
        if (isEditing && editingCalendarId) {
          await updateCalendar({
            calendarId: editingCalendarId,
            description: calendarDescription,
            title: calendarTitle,
          });
          return;
        }

        await createCalendar({
          description: calendarDescription,
          title: calendarTitle,
        });
      },
      {
        error: isEditing ? "calendarUpdateFailed" : "calendarCreateFailed",
        success: isEditing ? "calendarUpdateSuccess" : "calendarCreateSuccess",
        onError: (error) => setCalendarError(getCalendarErrorMessage(error, t)),
        onSuccess: resetCalendarForm,
      },
    ).catch(() => undefined);
  }

  function handleStartCalendarEdit(calendar: CalendarSummary) {
    setCalendarDescription(calendar.description);
    setCalendarTitle(calendar.label);
    setEditingCalendarId(calendar.id);
    setCalendarError("");
  }

  function handleDeleteCalendar(calendarId: string) {
    void runToastOperation(() => deleteCalendar(calendarId), {
      error: "calendarDeleteFailed",
      success: "calendarDeleteSuccess",
      onSuccess: () => {
        if (editingCalendarId === calendarId) {
          resetCalendarForm();
        }
      },
    }).catch(() => undefined);
  }

  function handleShareRoleChange(shareId: string, role: CalendarRole) {
    void runToastOperation(() => updateCalendarShareRole({ shareId, role }), {
      error: "calendarShareUpdateFailed",
      success: "calendarShareUpdateSuccess",
    }).catch(() => undefined);
  }

  function handleRevokeShare(shareId: string) {
    void runToastOperation(() => revokeCalendarShare(shareId), {
      error: "calendarShareRevokeFailed",
      success: "calendarShareRevokeSuccess",
    }).catch(() => undefined);
  }

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
      <ItineraryRealtimeAlert
        calendarsRealtimeError={calendarsRealtimeError}
        itineraryRealtimeError={itineraryRealtimeError}
        t={t}
      />

      {!hasActiveCalendars && !isItineraryLoading ? (
        <NoCalendarEmptyState
          onCreateCalendar={() => {
            resetCalendarForm();
            setCalendarDialogOpen(true);
          }}
          t={t}
        />
      ) : null}

      {hasActiveCalendars && isItineraryLoading ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <Skeleton className="h-9 w-full max-w-md" />
          <Skeleton className="min-h-0 flex-1" />
        </div>
      ) : null}

      {hasActiveCalendars ? (
        <div
          className={cn(
            "min-h-0 w-full flex-1 overflow-hidden",
            isItineraryLoading && "hidden",
          )}
        >
          <section
            aria-label={t("calendarAriaLabel")}
            className="tabi-itinerary-calendar h-full min-h-0 w-full min-w-0"
            style={calendarStyle}
          >
            <DragAndDropCalendar
              allDayAccessor="allDay"
              className="tabi-big-calendar"
              components={components}
              culture={locale}
              date={selectedDate}
              defaultView={Views.WEEK}
              endAccessor="end"
              eventPropGetter={eventPropGetter}
              events={events}
              localizer={localizer}
              messages={messages}
              onEventDrop={
                canEditSelectedCalendar ? handleEventTimeChange : undefined
              }
              onEventResize={
                canEditSelectedCalendar ? handleEventTimeChange : undefined
              }
              onNavigate={setSelectedDate}
              onSelectEvent={openEditDialog}
              onSelectSlot={
                canEditSelectedCalendar ? openSlotDialog : undefined
              }
              onView={setCalendarView}
              popup
              resizable={canEditSelectedCalendar}
              selectable={canEditSelectedCalendar}
              startAccessor="start"
              step={timeGridStep}
              timeslots={TIMESLOTS_BY_STEP[timeGridStep]}
              titleAccessor="title"
              view={calendarView}
              views={CALENDAR_VIEWS}
            />
          </section>
        </div>
      ) : null}

      <ItineraryItemDialog
        canEdit={canEditSelectedCalendar}
        categories={categories}
        categoryMap={categoryMap}
        draft={draft}
        formError={formError}
        isDeleting={isDeleting}
        isSaving={isSaving}
        locale={locale}
        onDelete={handleDelete}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        open={dialogOpen}
        setDraft={setDraft}
        t={t}
      />

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setPendingRecurringAction(null);
          }
        }}
        open={Boolean(pendingRecurringAction)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("recurrenceScope.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRecurringAction?.kind === "delete"
                ? t("recurrenceScope.deleteDescription")
                : t("recurrenceScope.editDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("recurrenceScope.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleRecurringActionScope("one")}
              variant="outline"
            >
              {t("recurrenceScope.thisOccurrence")}
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleRecurringActionScope("all")}
              variant={
                pendingRecurringAction?.kind === "delete"
                  ? "destructive"
                  : "default"
              }
            >
              {t("recurrenceScope.allOccurrences")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CalendarManagerDialog
        archivedCalendars={archivedCalendars}
        calendarDescription={calendarDescription}
        calendarError={calendarError}
        calendarTitle={calendarTitle}
        editingCalendarId={editingCalendarId}
        isDeletingCalendar={isDeletingCalendar}
        isSavingCalendar={isSavingCalendar}
        onCancelEdit={resetCalendarForm}
        onDeleteCalendar={handleDeleteCalendar}
        onOpenChange={setCalendarDialogOpen}
        onStartCalendarEdit={handleStartCalendarEdit}
        onSubmit={handleCalendarSubmit}
        open={calendarDialogOpen}
        ownedCalendars={ownedCalendars}
        setCalendarDescription={setCalendarDescription}
        setCalendarError={setCalendarError}
        setCalendarTitle={setCalendarTitle}
        t={t}
      />

      <CalendarShareDialog
        isRevokingCalendarShare={isRevokingCalendarShare}
        isSharingCalendar={isSharingCalendar}
        isUpdatingCalendarShareRole={isUpdatingCalendarShareRole}
        onOpenChange={setShareDialogOpen}
        onRevokeShare={handleRevokeShare}
        onShareEmailChange={setShareEmail}
        onShareErrorChange={setShareError}
        onShareRoleChange={handleShareRoleChange}
        onSubmit={handleShareSubmit}
        open={shareDialogOpen}
        selectedCalendarOutgoingShares={selectedCalendarOutgoingShares}
        setShareRole={setShareRole}
        shareEmail={shareEmail}
        shareError={shareError}
        shareRole={shareRole}
        t={t}
      />
    </main>
  );
}
