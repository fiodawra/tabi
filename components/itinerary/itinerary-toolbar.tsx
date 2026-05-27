"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ToolbarProps, View } from "react-big-calendar";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { TimeGridStep } from "@/stores/itinerary-ui-store";
import { CALENDAR_VIEWS, TIME_GRID_STEPS } from "./itinerary-constants";
import type { CalendarEvent, TranslationFn } from "./itinerary-types";

type ItineraryToolbarProps = ToolbarProps<CalendarEvent> & {
  selectedCalendarDetail: string;
  setTimeGridStep: (step: TimeGridStep) => void;
  t: TranslationFn;
  timeGridStep: TimeGridStep;
};

export function ItineraryToolbar({
  label,
  onNavigate,
  onView,
  selectedCalendarDetail,
  setTimeGridStep,
  t,
  timeGridStep,
  view,
}: ItineraryToolbarProps) {
  return (
    <div className="mb-3 flex flex-col gap-3">
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="shrink-0 text-muted-foreground transition-colors hover:text-foreground" />
            <ButtonGroup
              aria-label={t("toolbar.navigation")}
              className="shrink-0"
            >
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
          </div>
          <h2 className="min-w-0 truncate font-semibold text-lg">{label}</h2>
        </div>

        <div className="flex min-w-0 flex-col gap-2 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between xl:justify-end">
          {selectedCalendarDetail ? (
            <p className="min-w-0 truncate text-muted-foreground text-xs min-[480px]:max-w-64 xl:max-w-56 2xl:max-w-72">
              {t("calendarSelector.current", {
                access: selectedCalendarDetail,
              })}
            </p>
          ) : null}
          <Separator
            className="hidden min-[480px]:block"
            orientation="vertical"
          />
          <div className="flex min-w-0 flex-col gap-2 min-[480px]:flex-row min-[480px]:items-center">
            <Select
              onValueChange={(nextStep) =>
                setTimeGridStep(Number(nextStep) as TimeGridStep)
              }
              value={String(timeGridStep)}
            >
              <SelectTrigger
                aria-label={t("toolbar.intervalSwitcher")}
                className="w-full min-[480px]:w-28"
                size="sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TIME_GRID_STEPS.map((step) => (
                    <SelectItem
                      key={step}
                      value={String(step)}
                    >
                      {t(`interval.${step}`)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Separator
              className="hidden min-[480px]:block"
              orientation="vertical"
            />
            <ButtonGroup
              aria-label={t("toolbar.viewSwitcher")}
              className="w-full min-w-0 min-[480px]:w-fit [&>[data-slot=button]]:flex-1 min-[480px]:[&>[data-slot=button]]:flex-none"
            >
              {CALENDAR_VIEWS.map((calendarView) => (
                <Button
                  aria-pressed={view === calendarView}
                  className={cn(
                    view === calendarView &&
                      "bg-primary ring-1 text-foreground hover:bg-primary/80 hover:text-foreground",
                  )}
                  key={calendarView}
                  onClick={() => onView(calendarView as View)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {t(`views.${calendarView}`)}
                </Button>
              ))}
            </ButtonGroup>
          </div>
        </div>
      </div>
    </div>
  );
}
