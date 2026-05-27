"use client";

import { format, getDay, isSameDay, parse, startOfWeek } from "date-fns";
import { enUS, id as idLocale } from "date-fns/locale";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  PlusIcon,
  Share2Icon,
  Trash2Icon,
} from "lucide-react";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  type EventProps,
  type SlotInfo,
  type ToolbarProps,
  type View,
  Views,
} from "react-big-calendar";
import withDragAndDrop, {
  type EventInteractionArgs,
} from "react-big-calendar/lib/addons/dragAndDrop";
import { toast } from "sonner";
import { ItineraryDateTimePicker } from "@/components/itinerary/itinerary-date-time-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCalendars } from "@/hooks/use-calendars";
import { useLocale, useTranslations } from "@/hooks/use-i18n";
import { useItinerary } from "@/hooks/use-itinerary";
import { cn } from "@/lib/utils";
import {
  type CalendarRole,
  type CalendarShare,
  CalendarShareError,
  type CalendarSummary,
} from "@/services/calendar-sharing-service";
import {
  ITINERARY_CATEGORIES,
  type ItineraryCategory,
  type ItineraryItem,
  type SaveItineraryItemInput,
} from "@/services/itinerary-service";
import {
  type TimeGridStep,
  useItineraryUiStore,
} from "@/stores/itinerary-ui-store";
import "./itinerary-calendar.css";

type CalendarEvent = {
  allDay: boolean;
  category: ItineraryCategory;
  end: Date;
  id: string;
  location: string;
  resource: ItineraryItem;
  start: Date;
  title: string;
};

type ItineraryDraft = {
  allDay: boolean;
  category: ItineraryCategory;
  description: string;
  endAt: Date;
  id?: string;
  location: string;
  startAt: Date;
  title: string;
};

type TranslationFn = ReturnType<typeof useTranslations>;

type ItineraryToolbarProps = ToolbarProps<CalendarEvent> & {
  canCreateItem: boolean;
  canShareCalendar: boolean;
  calendars: CalendarSummary[];
  onCreate: () => void;
  onOpenShareDialog: () => void;
  onSelectCalendar: (calendarId: string) => void;
  selectedCalendarId: string | null;
  setTimeGridStep: (step: TimeGridStep) => void;
  t: TranslationFn;
  timeGridStep: TimeGridStep;
};

const localizer = dateFnsLocalizer({
  format,
  getDay,
  locales: {
    en: enUS,
    id: idLocale,
    "id-x-gaul": idLocale,
  },
  parse,
  startOfWeek,
});

const DragAndDropCalendar = withDragAndDrop<CalendarEvent>(BigCalendar);
const CALENDAR_VIEWS: View[] = [
  Views.MONTH,
  Views.WEEK,
  Views.DAY,
  Views.AGENDA,
];
const TIME_GRID_STEPS: TimeGridStep[] = [15, 30, 60];
const TIMESLOTS_BY_STEP: Record<TimeGridStep, number> = {
  15: 4,
  30: 2,
  60: 1,
};
const CALENDAR_ROLES: CalendarRole[] = ["viewer", "editor"];

type ItineraryCalendarStyle = CSSProperties & {
  "--itinerary-timeslots-per-hour": number;
};

function readStoredDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function addHours(date: Date, hours: number) {
  const nextDate = new Date(date);
  nextDate.setHours(nextDate.getHours() + hours);

  return nextDate;
}

function getCalendarLabel(calendar: CalendarSummary, t: TranslationFn) {
  if (calendar.access === "owner") {
    return t("calendarSelector.main");
  }

  return calendar.label || calendar.ownerEmail || t("calendarSelector.shared");
}

function getCalendarDetail(calendar: CalendarSummary, t: TranslationFn) {
  if (calendar.access === "owner") {
    return calendar.ownerEmail || t("calendarSelector.owner");
  }

  return t(`access.${calendar.access}`);
}

function getShareErrorMessage(error: unknown, t: TranslationFn) {
  if (error instanceof CalendarShareError) {
    return t(`share.errors.${error.code}`);
  }

  return t("share.errors.generic");
}

function createStartDateForSelection(selectedDate: Date) {
  const now = new Date();
  const startAt = new Date(selectedDate);

  if (isSameDay(startAt, now)) {
    startAt.setHours(now.getHours() + 1, 0, 0, 0);
    return startAt;
  }

  startAt.setHours(9, 0, 0, 0);
  return startAt;
}

function createDraftFromDates(startAt: Date, endAt: Date): ItineraryDraft {
  return {
    allDay: false,
    category: "activity",
    description: "",
    endAt,
    location: "",
    startAt,
    title: "",
  };
}

function createDraftFromItem(item: ItineraryItem): ItineraryDraft {
  return {
    id: item.id,
    allDay: item.allDay,
    category: item.category,
    description: item.description,
    endAt: item.endAt,
    location: item.location,
    startAt: item.startAt,
    title: item.title,
  };
}

function ItineraryToolbar({
  calendars,
  canCreateItem,
  canShareCalendar,
  label,
  onCreate,
  onNavigate,
  onOpenShareDialog,
  onSelectCalendar,
  onView,
  selectedCalendarId,
  setTimeGridStep,
  t,
  timeGridStep,
  view,
}: ItineraryToolbarProps) {
  return (
    <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            onValueChange={onSelectCalendar}
            value={selectedCalendarId ?? calendars.at(0)?.id}
          >
            <SelectTrigger
              aria-label={t("calendarSelector.ariaLabel")}
              className="w-full sm:w-64"
            >
              <SelectValue placeholder={t("calendarSelector.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {calendars.map((calendar) => (
                  <SelectItem key={calendar.id} value={calendar.id}>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate">
                        {getCalendarLabel(calendar, t)}
                      </span>
                      <Badge variant="secondary">
                        {calendar.access === "owner"
                          ? t("access.owner")
                          : t(`access.${calendar.access}`)}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {canShareCalendar ? (
            <Button onClick={onOpenShareDialog} type="button" variant="outline">
              <Share2Icon data-icon="inline-start" />
              {t("share.open")}
            </Button>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <ButtonGroup aria-label={t("toolbar.navigation")}>
            <Button
              onClick={() => onNavigate("TODAY")}
              type="button"
              variant="outline"
            >
              {t("toolbar.today")}
            </Button>
            <Button
              aria-label={t("toolbar.previous")}
              onClick={() => onNavigate("PREV")}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronLeftIcon />
            </Button>
            <ButtonGroupSeparator />
            <Button
              aria-label={t("toolbar.next")}
              onClick={() => onNavigate("NEXT")}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronRightIcon />
            </Button>
          </ButtonGroup>
          <h2 className="truncate text-lg font-semibold">{label}</h2>
        </div>
      </div>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <ToggleGroup
          aria-label={t("toolbar.intervalSwitcher")}
          className="flex-wrap"
          onValueChange={(nextStep) => {
            if (nextStep) {
              setTimeGridStep(Number(nextStep) as TimeGridStep);
            }
          }}
          size="sm"
          type="single"
          value={String(timeGridStep)}
          variant="outline"
        >
          {TIME_GRID_STEPS.map((step) => (
            <ToggleGroupItem key={step} value={String(step)}>
              {t(`interval.${step}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          aria-label={t("toolbar.viewSwitcher")}
          className="flex-wrap"
          onValueChange={(nextView) => {
            if (nextView) {
              onView(nextView as View);
            }
          }}
          size="sm"
          type="single"
          value={view}
          variant="outline"
        >
          {CALENDAR_VIEWS.map((calendarView) => (
            <ToggleGroupItem key={calendarView} value={calendarView}>
              {t(`views.${calendarView}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button disabled={!canCreateItem} onClick={onCreate} type="button">
          <PlusIcon data-icon="inline-start" />
          {t("add")}
        </Button>
      </div>
    </div>
  );
}

function CalendarEventContent({ event }: EventProps<CalendarEvent>) {
  return (
    <div className="tabi-calendar-event-content">
      <span className="tabi-calendar-event-title">{event.title}</span>
      {event.location ? (
        <span className="tabi-calendar-event-location">{event.location}</span>
      ) : null}
    </div>
  );
}

export function ItineraryCalendar() {
  const t = useTranslations("ItineraryPage");
  const tToast = useTranslations("OperationToast");
  const locale = useLocale();
  const {
    calendars,
    calendarsRealtimeError,
    isRevokingCalendarShare,
    isSharingCalendar,
    isUpdatingCalendarShareRole,
    outgoingCalendarShares,
    revokeCalendarShare,
    selectedCalendar,
    selectedCalendarId,
    setSelectedCalendarId,
    shareCalendar,
    updateCalendarShareRole,
  } = useCalendars();
  const {
    createItineraryItem,
    deleteItineraryItem,
    itineraryItems,
    itineraryRealtimeError,
    isCreatingItineraryItem,
    isDeletingItineraryItem,
    isItineraryLoading,
    isUpdatingItineraryItem,
    updateItineraryItem,
  } = useItinerary(selectedCalendar);
  const calendarView = useItineraryUiStore((state) => state.calendarView);
  const selectedDateValue = useItineraryUiStore((state) => state.selectedDate);
  const setCalendarView = useItineraryUiStore((state) => state.setCalendarView);
  const setSelectedDate = useItineraryUiStore((state) => state.setSelectedDate);
  const setTimeGridStep = useItineraryUiStore((state) => state.setTimeGridStep);
  const timeGridStep = useItineraryUiStore((state) => state.timeGridStep);
  const selectedDate = useMemo(
    () => readStoredDate(selectedDateValue),
    [selectedDateValue],
  );
  const calendarStyle = useMemo<ItineraryCalendarStyle>(
    () => ({
      "--itinerary-timeslots-per-hour": TIMESLOTS_BY_STEP[timeGridStep],
    }),
    [timeGridStep],
  );
  const [draft, setDraft] = useState<ItineraryDraft>(() => {
    const startAt = createStartDateForSelection(selectedDate);
    return createDraftFromDates(startAt, addHours(startAt, 1));
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareRole, setShareRole] = useState<CalendarRole>("viewer");
  const [formError, setFormError] = useState("");
  const canEditSelectedCalendar =
    selectedCalendar?.access === "owner" ||
    selectedCalendar?.access === "editor";
  const canShareSelectedCalendar = selectedCalendar?.access === "owner";
  const selectedCalendarDetail = selectedCalendar
    ? getCalendarDetail(selectedCalendar, t)
    : "";
  const isSaving = isCreatingItineraryItem || isUpdatingItineraryItem;

  const events = useMemo<CalendarEvent[]>(
    () =>
      itineraryItems.map((item) => ({
        id: item.id,
        allDay: item.allDay,
        category: item.category,
        end: item.endAt,
        location: item.location,
        resource: item,
        start: item.startAt,
        title: item.title,
      })),
    [itineraryItems],
  );

  useEffect(() => {
    if (itineraryRealtimeError) {
      toast.error(tToast("itineraryRealtimeFailed"));
    }
  }, [itineraryRealtimeError, tToast]);

  useEffect(() => {
    if (calendarsRealtimeError) {
      toast.error(tToast("calendarSharingRealtimeFailed"));
    }
  }, [calendarsRealtimeError, tToast]);

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
    setDraft(createDraftFromItem(event.resource));
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

  const components = useMemo(
    () => ({
      event: CalendarEventContent,
      toolbar: (toolbarProps: ToolbarProps<CalendarEvent>) => (
        <ItineraryToolbar
          {...toolbarProps}
          calendars={calendars}
          canCreateItem={canEditSelectedCalendar}
          canShareCalendar={canShareSelectedCalendar}
          onCreate={openCreateDialog}
          onOpenShareDialog={() => {
            setShareError("");
            setShareDialogOpen(true);
          }}
          onSelectCalendar={setSelectedCalendarId}
          selectedCalendarId={selectedCalendarId}
          setTimeGridStep={setTimeGridStep}
          t={t}
          timeGridStep={timeGridStep}
        />
      ),
    }),
    [
      calendars,
      canEditSelectedCalendar,
      canShareSelectedCalendar,
      openCreateDialog,
      selectedCalendarId,
      setSelectedCalendarId,
      setTimeGridStep,
      t,
      timeGridStep,
    ],
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
    return {
      className: cn(
        "tabi-calendar-event",
        `tabi-calendar-event--${event.category}`,
      ),
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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

    const input: SaveItineraryItemInput = {
      allDay: draft.allDay,
      category: draft.category,
      description: draft.description.trim(),
      endAt: draft.endAt,
      location: draft.location.trim(),
      startAt: draft.startAt,
      title: draft.title.trim(),
    };

    try {
      if (draft.id) {
        await updateItineraryItem({
          itineraryItemId: draft.id,
          input,
        });
        toast.success(tToast("itineraryUpdateSuccess"));
      } else {
        await createItineraryItem(input);
        toast.success(tToast("itineraryCreateSuccess"));
      }

      setDialogOpen(false);
    } catch {
      toast.error(
        draft.id
          ? tToast("itineraryUpdateFailed")
          : tToast("itineraryCreateFailed"),
      );
    }
  }

  async function handleDelete() {
    if (!draft.id || !canEditSelectedCalendar) {
      return;
    }

    try {
      await deleteItineraryItem(draft.id);
      toast.success(tToast("itineraryDeleteSuccess"));
      setDialogOpen(false);
    } catch {
      toast.error(tToast("itineraryDeleteFailed"));
    }
  }

  async function handleEventTimeChange({
    end,
    event,
    isAllDay,
    start,
  }: EventInteractionArgs<CalendarEvent>) {
    if (!canEditSelectedCalendar) {
      return;
    }

    try {
      await updateItineraryItem({
        itineraryItemId: event.id,
        input: {
          allDay: isAllDay ?? event.allDay,
          endAt: new Date(end),
          startAt: new Date(start),
        },
      });
    } catch {
      toast.error(tToast("itineraryUpdateFailed"));
    }
  }

  async function handleShareSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setShareError("");
      await shareCalendar({
        recipientEmail: shareEmail,
        role: shareRole,
      });
      toast.success(tToast("calendarShareSuccess"));
      setShareEmail("");
      setShareRole("viewer");
    } catch (error) {
      setShareError(getShareErrorMessage(error, t));
      toast.error(tToast("calendarShareFailed"));
    }
  }

  async function handleShareRoleChange(shareId: string, role: CalendarRole) {
    try {
      await updateCalendarShareRole({ shareId, role });
      toast.success(tToast("calendarShareUpdateSuccess"));
    } catch {
      toast.error(tToast("calendarShareUpdateFailed"));
    }
  }

  async function handleRevokeShare(shareId: string) {
    try {
      await revokeCalendarShare(shareId);
      toast.success(tToast("calendarShareRevokeSuccess"));
    } catch {
      toast.error(tToast("calendarShareRevokeFailed"));
    }
  }

  return (
    <main className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("description")}
        </p>
        {selectedCalendarDetail ? (
          <p className="text-xs text-muted-foreground">
            {t("calendarSelector.current", {
              access: selectedCalendarDetail,
            })}
          </p>
        ) : null}
      </div>

      {itineraryRealtimeError || calendarsRealtimeError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {itineraryRealtimeError
            ? t("realtimeError")
            : t("share.realtimeError")}
        </div>
      ) : null}

      {isItineraryLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-full max-w-md" />
          <Skeleton className="h-[520px] w-full" />
        </div>
      ) : null}

      {!isItineraryLoading && events.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarDaysIcon />
            </EmptyMedia>
            <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
            <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openCreateDialog} type="button">
              <PlusIcon data-icon="inline-start" />
              {t("add")}
            </Button>
          </EmptyContent>
        </Empty>
      ) : null}

      <section
        aria-label={t("calendarAriaLabel")}
        className={cn(
          "tabi-itinerary-calendar",
          isItineraryLoading && "hidden",
        )}
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
          onSelectSlot={canEditSelectedCalendar ? openSlotDialog : undefined}
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

      <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {!canEditSelectedCalendar && draft.id
                  ? t("dialog.viewTitle")
                  : draft.id
                    ? t("dialog.editTitle")
                    : t("dialog.createTitle")}
              </DialogTitle>
              <DialogDescription>
                {!canEditSelectedCalendar && draft.id
                  ? t("dialog.viewDescription")
                  : t("dialog.description")}
              </DialogDescription>
            </DialogHeader>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="itinerary-title">
                  {t("fields.title")}
                </FieldLabel>
                <Input
                  disabled={!canEditSelectedCalendar}
                  id="itinerary-title"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder={t("placeholders.title")}
                  required
                  value={draft.title}
                />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <ItineraryDateTimePicker
                    disabled={!canEditSelectedCalendar}
                    id="itinerary-start"
                    label={t("fields.start")}
                    locale={locale}
                    onChange={(startAt) =>
                      setDraft((current) => ({
                        ...current,
                        startAt,
                        endAt:
                          current.endAt <= startAt
                            ? addHours(startAt, 1)
                            : current.endAt,
                      }))
                    }
                    value={draft.startAt}
                  />
                </Field>
                <Field>
                  <ItineraryDateTimePicker
                    disabled={!canEditSelectedCalendar}
                    id="itinerary-end"
                    label={t("fields.end")}
                    locale={locale}
                    onChange={(endAt) =>
                      setDraft((current) => ({ ...current, endAt }))
                    }
                    value={draft.endAt}
                  />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="itinerary-location">
                    {t("fields.location")}
                  </FieldLabel>
                  <Input
                    disabled={!canEditSelectedCalendar}
                    id="itinerary-location"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        location: event.target.value,
                      }))
                    }
                    placeholder={t("placeholders.location")}
                    value={draft.location}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("fields.category")}</FieldLabel>
                  <Select
                    disabled={!canEditSelectedCalendar}
                    onValueChange={(category) =>
                      setDraft((current) => ({
                        ...current,
                        category: category as ItineraryCategory,
                      }))
                    }
                    value={draft.category}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {ITINERARY_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {t(`categories.${category}`)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field orientation="horizontal">
                <Checkbox
                  checked={draft.allDay}
                  disabled={!canEditSelectedCalendar}
                  id="itinerary-all-day"
                  onCheckedChange={(checked) =>
                    setDraft((current) => ({
                      ...current,
                      allDay: checked === true,
                    }))
                  }
                />
                <FieldContent>
                  <FieldLabel htmlFor="itinerary-all-day">
                    {t("fields.allDay")}
                  </FieldLabel>
                  <FieldDescription>{t("fields.allDayHint")}</FieldDescription>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="itinerary-description">
                  {t("fields.description")}
                </FieldLabel>
                <Textarea
                  disabled={!canEditSelectedCalendar}
                  id="itinerary-description"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder={t("placeholders.description")}
                  value={draft.description}
                />
              </Field>
              <FieldError>{formError}</FieldError>
            </FieldGroup>

            <DialogFooter>
              {!canEditSelectedCalendar ? (
                <Button onClick={() => setDialogOpen(false)} type="button">
                  {t("close")}
                </Button>
              ) : null}
              {canEditSelectedCalendar && draft.id ? (
                <Button
                  disabled={isDeletingItineraryItem || isSaving}
                  onClick={handleDelete}
                  type="button"
                  variant="destructive"
                >
                  {isDeletingItineraryItem ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Trash2Icon data-icon="inline-start" />
                  )}
                  {t("delete")}
                </Button>
              ) : null}
              {canEditSelectedCalendar ? (
                <Button
                  disabled={isDeletingItineraryItem || isSaving}
                  type="submit"
                >
                  {isSaving ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <MapPinIcon data-icon="inline-start" />
                  )}
                  {draft.id ? t("save") : t("create")}
                </Button>
              ) : null}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setShareDialogOpen} open={shareDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("share.title")}</DialogTitle>
            <DialogDescription>{t("share.description")}</DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-4" onSubmit={handleShareSubmit}>
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-[1fr_9rem]">
                <Field>
                  <FieldLabel htmlFor="calendar-share-email">
                    {t("share.email")}
                  </FieldLabel>
                  <Input
                    disabled={isSharingCalendar}
                    id="calendar-share-email"
                    onChange={(event) => {
                      setShareEmail(event.target.value);
                      setShareError("");
                    }}
                    placeholder={t("share.emailPlaceholder")}
                    type="email"
                    value={shareEmail}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("share.role")}</FieldLabel>
                  <Select
                    disabled={isSharingCalendar}
                    onValueChange={(role) => setShareRole(role as CalendarRole)}
                    value={shareRole}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {CALENDAR_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {t(`access.${role}`)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <FieldError>{shareError}</FieldError>
            </FieldGroup>

            <DialogFooter>
              <Button disabled={isSharingCalendar} type="submit">
                {isSharingCalendar ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Share2Icon data-icon="inline-start" />
                )}
                {t("share.submit")}
              </Button>
            </DialogFooter>
          </form>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{t("share.sharedWith")}</h3>
            {outgoingCalendarShares.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                {t("share.empty")}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {outgoingCalendarShares.map((share: CalendarShare) => (
                  <div
                    className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                    key={share.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {share.recipientEmail}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(`access.${share.role}`)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        disabled={isUpdatingCalendarShareRole}
                        onValueChange={(role) =>
                          void handleShareRoleChange(
                            share.id,
                            role as CalendarRole,
                          )
                        }
                        value={share.role}
                      >
                        <SelectTrigger
                          aria-label={t("share.role")}
                          className="w-28"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {CALENDAR_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {t(`access.${role}`)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <Button
                        disabled={isRevokingCalendarShare}
                        onClick={() => void handleRevokeShare(share.id)}
                        type="button"
                        variant="ghost"
                      >
                        {t("share.revoke")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
