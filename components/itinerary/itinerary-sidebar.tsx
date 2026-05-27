"use client";

import { CalendarPlusIcon, PlusIcon, Share2Icon, TagsIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";
import type { CalendarSummary } from "@/services/calendar-sharing-service";
import type { ItineraryCategory } from "@/services/itinerary-category-service";
import { CategoryFilterList } from "./category-filter-list";
import type { CalendarEvent } from "./itinerary-types";
import { getCalendarLabel } from "./itinerary-utils";
import { UpcomingEventsList } from "./upcoming-events-list";

type ItinerarySidebarProps = {
  calendars: CalendarSummary[];
  canEditSelectedCalendar: boolean;
  canManageCalendars: boolean;
  canShareSelectedCalendar: boolean;
  categories: ItineraryCategory[];
  isUncategorizedFilterVisible: boolean;
  locale: string;
  onCategoryFilterChange: (categoryId: string, isVisible: boolean) => void;
  onCreateItem: () => void;
  onOpenCalendarDialog: () => void;
  onOpenCategoryManager: () => void;
  onOpenShareDialog: () => void;
  onSelectCalendar: (calendarId: string) => void;
  onSelectedDateChange: (date: Date) => void;
  onUncategorizedFilterChange: (isVisible: boolean) => void;
  selectedCalendar: CalendarSummary | null;
  selectedCalendarId: string | null;
  selectedDate: Date;
  t: (key: string) => string;
  upcomingEvents: CalendarEvent[];
  visibleCategoryIdSet: Set<string>;
};

export function ItinerarySidebar({
  calendars,
  canEditSelectedCalendar,
  canManageCalendars,
  canShareSelectedCalendar,
  categories,
  isUncategorizedFilterVisible,
  locale,
  onCategoryFilterChange,
  onCreateItem,
  onOpenCalendarDialog,
  onOpenCategoryManager,
  onOpenShareDialog,
  onSelectCalendar,
  onSelectedDateChange,
  onUncategorizedFilterChange,
  selectedCalendar,
  selectedCalendarId,
  selectedDate,
  t,
  upcomingEvents,
  visibleCategoryIdSet,
}: ItinerarySidebarProps) {
  return (
    <Sidebar className="border-r" collapsible="offcanvas">
      <SidebarHeader className="border-b p-3">
        <div className="flex min-w-0 items-center gap-2">
          <Select
            disabled={calendars.length === 0}
            onValueChange={onSelectCalendar}
            value={selectedCalendarId ?? calendars.at(0)?.id}
          >
            <SelectTrigger
              aria-label={t("calendarSelector.ariaLabel")}
              className="min-w-0 flex-1"
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
            </Button>
          ) : null}
        </div>

        {canShareSelectedCalendar ? (
          <Button
            className="w-full"
            onClick={onOpenShareDialog}
            type="button"
            variant="outline"
          >
            <Share2Icon data-icon="inline-start" />
            {t("share.open")}
          </Button>
        ) : null}

        <Button
          className="w-full"
          disabled={!canEditSelectedCalendar}
          onClick={onCreateItem}
          type="button"
        >
          <PlusIcon data-icon="inline-start" />
          {t("add")}
        </Button>
      </SidebarHeader>

      <SidebarContent className="tabi-itinerary-sidebar-scroll gap-2 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 py-1 font-semibold text-muted-foreground/80 text-xs">
            {t("sidebar.calendar")}
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-1">
            <Calendar
              className="w-full rounded-lg border bg-background"
              mode="single"
              onSelect={(date) => {
                if (date) {
                  onSelectedDateChange(date);
                }
              }}
              selected={selectedDate}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {selectedCalendar ? (
          <>
            <SidebarGroup className="relative">
              <SidebarGroupLabel className="flex items-center justify-between px-2 py-1 font-semibold text-muted-foreground/80 text-xs">
                <span>{t("sidebar.categories")}</span>
              </SidebarGroupLabel>
              {canEditSelectedCalendar ? (
                <SidebarGroupAction
                  onClick={onOpenCategoryManager}
                  title={t("categoryManager.open")}
                >
                  <TagsIcon />
                </SidebarGroupAction>
              ) : null}
              <SidebarGroupContent className="px-2 py-1">
                <CategoryFilterList
                  categories={categories}
                  isUncategorizedVisible={isUncategorizedFilterVisible}
                  onCategoryChange={onCategoryFilterChange}
                  onUncategorizedChange={onUncategorizedFilterChange}
                  t={t}
                  visibleCategoryIdSet={visibleCategoryIdSet}
                />

                {categories.length === 0 ? (
                  <p className="mt-1 rounded-md border border-dashed p-3 text-center text-muted-foreground text-xs">
                    {t("sidebar.categoriesEmpty")}
                  </p>
                ) : null}
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="px-2 py-1 font-semibold text-muted-foreground/80 text-xs">
                {t("sidebar.upcoming")}
              </SidebarGroupLabel>
              <SidebarGroupContent className="px-2 py-1">
                <UpcomingEventsList
                  events={upcomingEvents}
                  locale={locale}
                  onSelectDate={onSelectedDateChange}
                  t={t}
                />
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : null}
      </SidebarContent>
    </Sidebar>
  );
}
