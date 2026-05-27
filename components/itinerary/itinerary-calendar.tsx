"use client";

import { format, getDay, isSameDay, parse, startOfWeek } from "date-fns";
import { enUS, id as idLocale } from "date-fns/locale";
import {
  CalendarDaysIcon,
  CalendarPlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ListFilterIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  Share2Icon,
  TagsIcon,
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
import { useItineraryCategories } from "@/hooks/use-itinerary-categories";
import { cn } from "@/lib/utils";
import {
  type CalendarRole,
  type CalendarShare,
  CalendarShareError,
  type CalendarSummary,
} from "@/services/calendar-sharing-service";
import {
  type ItineraryCategory,
  ItineraryCategoryError,
} from "@/services/itinerary-category-service";
import type {
  ItineraryItem,
  SaveItineraryItemInput,
} from "@/services/itinerary-service";
import {
  type TimeGridStep,
  useItineraryUiStore,
} from "@/stores/itinerary-ui-store";
import "./itinerary-calendar.css";

type CalendarEvent = {
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

type ItineraryDraft = {
  allDay: boolean;
  category: string | null;
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
  canManageCalendars: boolean;
  canShareCalendar: boolean;
  calendars: CalendarSummary[];
  onCreate: () => void;
  onOpenCalendarDialog: () => void;
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
const UNCATEGORIZED_VALUE = "__uncategorized__";
const DEFAULT_EVENT_COLOR = "var(--muted-foreground)";

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

function getCalendarErrorMessage(error: unknown, t: TranslationFn) {
  if (error instanceof CalendarShareError) {
    return t(`calendarManager.errors.${error.code}`);
  }

  return t("calendarManager.errors.generic");
}

function getCategoryErrorMessage(error: unknown, t: TranslationFn) {
  if (error instanceof ItineraryCategoryError) {
    return t(`categoryManager.errors.${error.code}`);
  }

  return t("categoryManager.errors.generic");
}

function getReadableTextColor(color: string | null) {
  if (!color?.startsWith("#") || color.length !== 7) {
    return "var(--background)";
  }

  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.66 ? "var(--foreground)" : "var(--background)";
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
    category: null,
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
  canManageCalendars,
  canShareCalendar,
  label,
  onCreate,
  onOpenCalendarDialog,
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
          {canManageCalendars ? (
            <Button
              onClick={onOpenCalendarDialog}
              type="button"
              variant="outline"
            >
              <CalendarPlusIcon data-icon="inline-start" />
              {t("calendarManager.open")}
            </Button>
          ) : null}
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
    setSelectedCalendarId,
    shareCalendar,
    updateCalendar,
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
  const {
    categories,
    categoriesRealtimeError,
    createCategory,
    deleteCategory,
    isCreatingCategory,
    isDeletingCategory,
    isUpdatingCategory,
    updateCategory,
  } = useItineraryCategories(selectedCalendar);
  const calendarView = useItineraryUiStore((state) => state.calendarView);
  const categoryFilterIds = useItineraryUiStore((state) =>
    selectedCalendarId
      ? state.categoryFiltersByCalendarId[selectedCalendarId]
      : undefined,
  );
  const selectedDateValue = useItineraryUiStore((state) => state.selectedDate);
  const isUncategorizedFilterVisible = useItineraryUiStore((state) =>
    selectedCalendarId
      ? (state.uncategorizedFiltersByCalendarId[selectedCalendarId] ?? true)
      : true,
  );
  const setCalendarView = useItineraryUiStore((state) => state.setCalendarView);
  const setCategoryFilter = useItineraryUiStore(
    (state) => state.setCategoryFilter,
  );
  const setSelectedDate = useItineraryUiStore((state) => state.setSelectedDate);
  const setTimeGridStep = useItineraryUiStore((state) => state.setTimeGridStep);
  const setUncategorizedFilter = useItineraryUiStore(
    (state) => state.setUncategorizedFilter,
  );
  const timeGridStep = useItineraryUiStore((state) => state.timeGridStep);
  const selectedDate = useMemo(
    () => readStoredDate(selectedDateValue),
    [selectedDateValue],
  );
  const dateLocale = locale === "en" ? enUS : idLocale;
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
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [calendarDescription, setCalendarDescription] = useState("");
  const [calendarTitle, setCalendarTitle] = useState("");
  const [editingCalendarId, setEditingCalendarId] = useState<string | null>(
    null,
  );
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState("#2563eb");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareRole, setShareRole] = useState<CalendarRole>("viewer");
  const [formError, setFormError] = useState("");
  const canEditSelectedCalendar =
    selectedCalendar?.access === "owner" ||
    selectedCalendar?.access === "editor";
  const canShareSelectedCalendar = selectedCalendar?.access === "owner";
  const ownedCalendars = calendars.filter(
    (calendar) => calendar.access === "owner",
  );
  const selectedCalendarDetail = selectedCalendar
    ? getCalendarDetail(selectedCalendar, t)
    : "";
  const isSaving = isCreatingItineraryItem || isUpdatingItineraryItem;
  const isSavingCalendar = isCreatingCalendar || isUpdatingCalendar;
  const isSavingCategory = isCreatingCategory || isUpdatingCategory;
  const hasActiveCalendars = calendars.length > 0;
  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const visibleCategoryIds = useMemo(
    () =>
      categoryFilterIds?.filter((categoryId) => categoryMap.has(categoryId)) ??
      categories.map((category) => category.id),
    [categories, categoryFilterIds, categoryMap],
  );
  const visibleCategoryIdSet = useMemo(
    () => new Set(visibleCategoryIds),
    [visibleCategoryIds],
  );

  const events = useMemo<CalendarEvent[]>(
    () =>
      itineraryItems
        .filter((item) => {
          const category = item.category
            ? categoryMap.get(item.category)
            : null;

          if (!category) {
            return isUncategorizedFilterVisible;
          }

          return visibleCategoryIdSet.has(category.id);
        })
        .map((item) => {
          const category = item.category
            ? categoryMap.get(item.category)
            : null;

          return {
            id: item.id,
            allDay: item.allDay,
            categoryColor: category?.color ?? null,
            categoryId: category?.id ?? null,
            categoryName: category?.name ?? null,
            end: item.endAt,
            location: item.location,
            resource: item,
            start: item.startAt,
            title: item.title,
          };
        }),
    [
      categoryMap,
      isUncategorizedFilterVisible,
      itineraryItems,
      visibleCategoryIdSet,
    ],
  );
  const upcomingEvents = useMemo(
    () =>
      events
        .filter((event) => event.end >= new Date())
        .sort((firstEvent, secondEvent) => {
          return firstEvent.start.getTime() - secondEvent.start.getTime();
        })
        .slice(0, 5),
    [events],
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

  useEffect(() => {
    if (categoriesRealtimeError) {
      toast.error(tToast("categoryRealtimeFailed"));
    }
  }, [categoriesRealtimeError, tToast]);

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
          canManageCalendars
          canShareCalendar={canShareSelectedCalendar}
          onCreate={openCreateDialog}
          onOpenCalendarDialog={() => {
            setCalendarError("");
            setCalendarDescription("");
            setCalendarTitle("");
            setEditingCalendarId(null);
            setCalendarDialogOpen(true);
          }}
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
    const backgroundColor = event.categoryColor ?? DEFAULT_EVENT_COLOR;

    return {
      className: "tabi-calendar-event",
      style: {
        backgroundColor,
        color: getReadableTextColor(event.categoryColor),
      },
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
      category:
        draft.category && categoryMap.has(draft.category)
          ? draft.category
          : null,
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

  async function handleCalendarSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setCalendarError("");

      if (editingCalendarId) {
        await updateCalendar({
          calendarId: editingCalendarId,
          description: calendarDescription,
          title: calendarTitle,
        });
        toast.success(tToast("calendarUpdateSuccess"));
      } else {
        await createCalendar({
          description: calendarDescription,
          title: calendarTitle,
        });
        toast.success(tToast("calendarCreateSuccess"));
      }

      setCalendarDescription("");
      setCalendarTitle("");
      setEditingCalendarId(null);
    } catch (error) {
      setCalendarError(getCalendarErrorMessage(error, t));
      toast.error(
        editingCalendarId
          ? tToast("calendarUpdateFailed")
          : tToast("calendarCreateFailed"),
      );
    }
  }

  function handleStartCalendarEdit(calendar: CalendarSummary) {
    setCalendarDescription(calendar.description);
    setCalendarTitle(calendar.label);
    setEditingCalendarId(calendar.id);
    setCalendarError("");
  }

  async function handleDeleteCalendar(calendarId: string) {
    try {
      await deleteCalendar(calendarId);
      toast.success(tToast("calendarDeleteSuccess"));

      if (editingCalendarId === calendarId) {
        setCalendarDescription("");
        setCalendarTitle("");
        setEditingCalendarId(null);
      }
    } catch {
      toast.error(tToast("calendarDeleteFailed"));
    }
  }

  async function handleCategorySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setCategoryError("");

      if (editingCategoryId) {
        await updateCategory({
          categoryId: editingCategoryId,
          color: categoryColor,
          name: categoryName,
        });
        toast.success(tToast("categoryUpdateSuccess"));
      } else {
        await createCategory({
          color: categoryColor,
          name: categoryName,
        });
        toast.success(tToast("categoryCreateSuccess"));
      }

      setCategoryColor("#2563eb");
      setCategoryName("");
      setEditingCategoryId(null);
    } catch (error) {
      setCategoryError(getCategoryErrorMessage(error, t));
      toast.error(
        editingCategoryId
          ? tToast("categoryUpdateFailed")
          : tToast("categoryCreateFailed"),
      );
    }
  }

  function handleStartCategoryEdit(category: ItineraryCategory) {
    setCategoryColor(category.color);
    setCategoryName(category.name);
    setCategoryError("");
    setEditingCategoryId(category.id);
  }

  async function handleDeleteCategory(categoryId: string) {
    try {
      await deleteCategory(categoryId);
      toast.success(tToast("categoryDeleteSuccess"));

      if (editingCategoryId === categoryId) {
        setCategoryColor("#2563eb");
        setCategoryName("");
        setEditingCategoryId(null);
      }
    } catch {
      toast.error(tToast("categoryDeleteFailed"));
    }
  }

  function handleCategoryFilterChange(categoryId: string, isVisible: boolean) {
    if (!selectedCalendarId) {
      return;
    }

    const nextCategoryIds = isVisible
      ? [...new Set([...visibleCategoryIds, categoryId])]
      : visibleCategoryIds.filter((visibleCategoryId) => {
          return visibleCategoryId !== categoryId;
        });

    setCategoryFilter(selectedCalendarId, nextCategoryIds);
  }

  function handleUncategorizedFilterChange(isVisible: boolean) {
    if (!selectedCalendarId) {
      return;
    }

    setUncategorizedFilter(selectedCalendarId, isVisible);
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

      {itineraryRealtimeError ||
      calendarsRealtimeError ||
      categoriesRealtimeError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {itineraryRealtimeError
            ? t("realtimeError")
            : categoriesRealtimeError
              ? t("category.realtimeError")
              : t("share.realtimeError")}
        </div>
      ) : null}

      {!hasActiveCalendars && !isItineraryLoading ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarPlusIcon />
            </EmptyMedia>
            <EmptyTitle>{t("calendarEmpty.title")}</EmptyTitle>
            <EmptyDescription>
              {t("calendarEmpty.description")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              onClick={() => {
                setCalendarError("");
                setCalendarDescription("");
                setCalendarTitle("");
                setEditingCalendarId(null);
                setCalendarDialogOpen(true);
              }}
              type="button"
            >
              <CalendarPlusIcon data-icon="inline-start" />
              {t("calendarManager.create")}
            </Button>
          </EmptyContent>
        </Empty>
      ) : null}

      {hasActiveCalendars && isItineraryLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-full max-w-md" />
          <Skeleton className="h-[520px] w-full" />
        </div>
      ) : null}

      {hasActiveCalendars && !isItineraryLoading && events.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {itineraryItems.length > 0 ? (
                <ListFilterIcon />
              ) : (
                <CalendarDaysIcon />
              )}
            </EmptyMedia>
            <EmptyTitle>
              {itineraryItems.length > 0
                ? t("filterEmptyTitle")
                : t("emptyTitle")}
            </EmptyTitle>
            <EmptyDescription>
              {itineraryItems.length > 0
                ? t("filterEmptyDescription")
                : t("emptyDescription")}
            </EmptyDescription>
          </EmptyHeader>
          {itineraryItems.length === 0 ? (
            <EmptyContent>
              <Button
                disabled={!canEditSelectedCalendar}
                onClick={openCreateDialog}
                type="button"
              >
                <PlusIcon data-icon="inline-start" />
                {t("add")}
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : null}

      {hasActiveCalendars ? (
        <div
          className={cn(
            "grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]",
            isItineraryLoading && "hidden",
          )}
        >
          <aside className="flex min-w-0 flex-col gap-5 rounded-md border p-3 xl:sticky xl:top-4 xl:self-start">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-sm font-medium">{t("sidebar.title")}</p>
              <p className="truncate text-xs text-muted-foreground">
                {selectedCalendar
                  ? getCalendarLabel(selectedCalendar, t)
                  : t("calendarSelector.placeholder")}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium">
                  {t("sidebar.categories")}
                </h2>
                {canEditSelectedCalendar ? (
                  <Button
                    onClick={() => {
                      setCategoryColor("#2563eb");
                      setCategoryError("");
                      setCategoryName("");
                      setEditingCategoryId(null);
                      setCategoryDialogOpen(true);
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <TagsIcon data-icon="inline-start" />
                    {t("categoryManager.open")}
                  </Button>
                ) : null}
              </div>

              <FieldGroup data-slot="checkbox-group">
                {categories.map((category) => (
                  <Field key={category.id} orientation="horizontal">
                    <Checkbox
                      checked={visibleCategoryIdSet.has(category.id)}
                      id={`category-filter-${category.id}`}
                      onCheckedChange={(checked) =>
                        handleCategoryFilterChange(
                          category.id,
                          checked === true,
                        )
                      }
                    />
                    <FieldContent>
                      <FieldLabel
                        className="min-w-0"
                        htmlFor={`category-filter-${category.id}`}
                      >
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="truncate">{category.name}</span>
                      </FieldLabel>
                    </FieldContent>
                  </Field>
                ))}
                <Field orientation="horizontal">
                  <Checkbox
                    checked={isUncategorizedFilterVisible}
                    id="category-filter-uncategorized"
                    onCheckedChange={(checked) =>
                      handleUncategorizedFilterChange(checked === true)
                    }
                  />
                  <FieldContent>
                    <FieldLabel htmlFor="category-filter-uncategorized">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full bg-muted-foreground"
                      />
                      {t("category.uncategorized")}
                    </FieldLabel>
                  </FieldContent>
                </Field>
              </FieldGroup>

              {categories.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  {t("sidebar.categoriesEmpty")}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-medium">{t("sidebar.upcoming")}</h2>
              {upcomingEvents.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  {t("sidebar.upcomingEmpty")}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {upcomingEvents.map((event) => (
                    <div
                      className="flex min-w-0 gap-2 rounded-md border p-2"
                      key={event.id}
                    >
                      <span
                        aria-hidden
                        className="mt-1 size-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            event.categoryColor ?? DEFAULT_EVENT_COLOR,
                        }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {event.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {format(event.start, "MMM d, HH:mm", {
                            locale: dateLocale,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section
            aria-label={t("calendarAriaLabel")}
            className="tabi-itinerary-calendar min-w-0"
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
                        category:
                          category === UNCATEGORIZED_VALUE ? null : category,
                      }))
                    }
                    value={
                      draft.category && categoryMap.has(draft.category)
                        ? draft.category
                        : UNCATEGORIZED_VALUE
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value={UNCATEGORIZED_VALUE}>
                          {t("category.uncategorized")}
                        </SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    {t("fields.categoryHint")}
                  </FieldDescription>
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

      <Dialog onOpenChange={setCalendarDialogOpen} open={calendarDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("calendarManager.title")}</DialogTitle>
            <DialogDescription>
              {t("calendarManager.description")}
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-4" onSubmit={handleCalendarSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="calendar-title">
                  {t("calendarManager.titleField")}
                </FieldLabel>
                <Input
                  disabled={isSavingCalendar}
                  id="calendar-title"
                  onChange={(event) => {
                    setCalendarTitle(event.target.value);
                    setCalendarError("");
                  }}
                  placeholder={t("calendarManager.titlePlaceholder")}
                  value={calendarTitle}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="calendar-description">
                  {t("calendarManager.descriptionField")}
                </FieldLabel>
                <Textarea
                  disabled={isSavingCalendar}
                  id="calendar-description"
                  onChange={(event) =>
                    setCalendarDescription(event.target.value)
                  }
                  placeholder={t("calendarManager.descriptionPlaceholder")}
                  value={calendarDescription}
                />
              </Field>
              <FieldError>{calendarError}</FieldError>
            </FieldGroup>
            <DialogFooter>
              {editingCalendarId ? (
                <Button
                  onClick={() => {
                    setCalendarDescription("");
                    setCalendarTitle("");
                    setEditingCalendarId(null);
                    setCalendarError("");
                  }}
                  type="button"
                  variant="ghost"
                >
                  {t("calendarManager.cancelEdit")}
                </Button>
              ) : null}
              <Button disabled={isSavingCalendar} type="submit">
                {isSavingCalendar ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <CalendarPlusIcon data-icon="inline-start" />
                )}
                {editingCalendarId
                  ? t("calendarManager.save")
                  : t("calendarManager.create")}
              </Button>
            </DialogFooter>
          </form>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">
              {t("calendarManager.yourCalendars")}
            </h3>
            <div className="flex flex-col gap-2">
              {ownedCalendars.map((calendar) => (
                <div
                  className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  key={calendar.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {getCalendarLabel(calendar, t)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {calendar.description || calendar.ownerEmail}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      disabled={isDeletingCalendar || isSavingCalendar}
                      onClick={() => handleStartCalendarEdit(calendar)}
                      type="button"
                      variant="outline"
                    >
                      <PencilIcon data-icon="inline-start" />
                      {t("calendarManager.edit")}
                    </Button>
                    <Button
                      disabled={isDeletingCalendar || isSavingCalendar}
                      onClick={() => void handleDeleteCalendar(calendar.id)}
                      type="button"
                      variant="destructive"
                    >
                      {isDeletingCalendar ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <Trash2Icon data-icon="inline-start" />
                      )}
                      {t("calendarManager.delete")}
                    </Button>
                  </div>
                </div>
              ))}
              {ownedCalendars.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  {t("calendarManager.empty")}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">
              {t("calendarManager.archived")}
            </h3>
            {archivedCalendars.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                {t("calendarManager.archivedEmpty")}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {archivedCalendars.map((calendar) => (
                  <div
                    className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                    key={calendar.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {getCalendarLabel(calendar, t)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {calendar.description || calendar.ownerEmail}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {t("calendarManager.archivedBadge")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setCategoryDialogOpen} open={categoryDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("categoryManager.title")}</DialogTitle>
            <DialogDescription>
              {t("categoryManager.description")}
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-4" onSubmit={handleCategorySubmit}>
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-[1fr_5rem]">
                <Field>
                  <FieldLabel htmlFor="category-name">
                    {t("categoryManager.name")}
                  </FieldLabel>
                  <Input
                    disabled={!canEditSelectedCalendar || isSavingCategory}
                    id="category-name"
                    onChange={(event) => {
                      setCategoryName(event.target.value);
                      setCategoryError("");
                    }}
                    placeholder={t("categoryManager.namePlaceholder")}
                    value={categoryName}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="category-color">
                    {t("categoryManager.color")}
                  </FieldLabel>
                  <Input
                    className="h-10 p-1"
                    disabled={!canEditSelectedCalendar || isSavingCategory}
                    id="category-color"
                    onChange={(event) => setCategoryColor(event.target.value)}
                    type="color"
                    value={categoryColor}
                  />
                </Field>
              </div>
              <FieldError>{categoryError}</FieldError>
            </FieldGroup>
            <DialogFooter>
              {editingCategoryId ? (
                <Button
                  onClick={() => {
                    setCategoryColor("#2563eb");
                    setCategoryError("");
                    setCategoryName("");
                    setEditingCategoryId(null);
                  }}
                  type="button"
                  variant="ghost"
                >
                  {t("categoryManager.cancelEdit")}
                </Button>
              ) : null}
              <Button
                disabled={!canEditSelectedCalendar || isSavingCategory}
                type="submit"
              >
                {isSavingCategory ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <PlusIcon data-icon="inline-start" />
                )}
                {editingCategoryId
                  ? t("categoryManager.save")
                  : t("categoryManager.create")}
              </Button>
            </DialogFooter>
          </form>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">
              {t("categoryManager.yourCategories")}
            </h3>
            {categories.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                {t("categoryManager.empty")}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {categories.map((category) => (
                  <div
                    className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                    key={category.id}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <p className="truncate text-sm font-medium">
                        {category.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        disabled={!canEditSelectedCalendar || isSavingCategory}
                        onClick={() => handleStartCategoryEdit(category)}
                        type="button"
                        variant="outline"
                      >
                        <PencilIcon data-icon="inline-start" />
                        {t("categoryManager.edit")}
                      </Button>
                      <Button
                        disabled={
                          !canEditSelectedCalendar ||
                          isDeletingCategory ||
                          isSavingCategory
                        }
                        onClick={() => void handleDeleteCategory(category.id)}
                        type="button"
                        variant="destructive"
                      >
                        {isDeletingCategory ? (
                          <Spinner data-icon="inline-start" />
                        ) : (
                          <Trash2Icon data-icon="inline-start" />
                        )}
                        {t("categoryManager.delete")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
            {selectedCalendarOutgoingShares.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                {t("share.empty")}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedCalendarOutgoingShares.map((share: CalendarShare) => (
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
