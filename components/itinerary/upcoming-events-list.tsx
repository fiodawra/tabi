"use client";

import { format } from "date-fns";
import { enUS, id as idLocale } from "date-fns/locale";
import { DEFAULT_EVENT_COLOR } from "./itinerary-constants";
import type { CalendarEvent } from "./itinerary-types";

type UpcomingEventsListProps = {
  events: CalendarEvent[];
  locale: string;
  onSelectDate: (date: Date) => void;
  t: (key: string) => string;
};

export function UpcomingEventsList({
  events,
  locale,
  onSelectDate,
  t,
}: UpcomingEventsListProps) {
  const dateLocale = locale === "en" ? enUS : idLocale;

  if (events.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-3 text-center text-muted-foreground text-xs">
        {t("sidebar.upcomingEmpty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {events.map((event) => (
        <button
          className="flex w-full min-w-0 gap-2.5 rounded-md border bg-background p-2 text-left transition-colors hover:border-primary/30 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          key={event.id}
          onClick={() => onSelectDate(event.start)}
          type="button"
        >
          <span
            aria-hidden
            className="mt-1.5 size-2 shrink-0 rounded-full"
            style={{
              backgroundColor: event.categoryColor ?? DEFAULT_EVENT_COLOR,
            }}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-foreground/90 text-xs">
              {event.title}
            </span>
            <span className="block truncate text-[10px] text-muted-foreground">
              {format(event.start, "MMM d, HH:mm", { locale: dateLocale })}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
