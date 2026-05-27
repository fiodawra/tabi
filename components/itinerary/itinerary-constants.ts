import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS, id as idLocale } from "date-fns/locale";
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  type View,
  Views,
} from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import type { CalendarRole } from "@/services/calendar-sharing-service";
import type { TimeGridStep } from "@/stores/itinerary-ui-store";
import type { CalendarEvent } from "./itinerary-types";

export const localizer = dateFnsLocalizer({
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

export const DragAndDropCalendar = withDragAndDrop<CalendarEvent>(BigCalendar);

export const CALENDAR_VIEWS: View[] = [
  Views.MONTH,
  Views.WEEK,
  Views.DAY,
  Views.AGENDA,
];

export const TIME_GRID_STEPS: TimeGridStep[] = [15, 30, 60];

export const TIMESLOTS_BY_STEP: Record<TimeGridStep, number> = {
  15: 4,
  30: 2,
  60: 1,
};

export const CALENDAR_ROLES: CalendarRole[] = ["viewer", "editor"];
export const UNCATEGORIZED_VALUE = "__uncategorized__";
export const DEFAULT_EVENT_COLOR = "var(--muted-foreground)";
export const DEFAULT_CATEGORY_COLOR = "#2563eb";
