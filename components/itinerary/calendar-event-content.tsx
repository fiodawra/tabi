"use client";

import type { EventProps } from "react-big-calendar";
import type { CalendarEvent } from "./itinerary-types";

export function CalendarEventContent({ event }: EventProps<CalendarEvent>) {
  return (
    <div className="tabi-calendar-event-content">
      <span className="tabi-calendar-event-title">{event.title}</span>
      {event.location ? (
        <span className="tabi-calendar-event-location">{event.location}</span>
      ) : null}
    </div>
  );
}
