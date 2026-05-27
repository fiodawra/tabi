"use client";

import { CalendarDaysIcon, ListTodoIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useTranslations } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import {
  ITINERARY_CATEGORIES,
  type ItineraryCategory,
} from "@/services/itinerary-service";
import { useItineraryUiStore } from "@/stores/itinerary-ui-store";

const CATEGORY_MARKER_CLASS: Record<ItineraryCategory, string> = {
  activity: "bg-chart-3",
  transport: "bg-chart-2",
  lodging: "bg-chart-4",
  food: "bg-chart-1",
  note: "bg-muted-foreground",
};

function readStoredDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export default function ItineraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("ItineraryPage");
  const selectedDateValue = useItineraryUiStore((state) => state.selectedDate);
  const setSelectedDate = useItineraryUiStore((state) => state.setSelectedDate);
  const selectedDate = readStoredDate(selectedDateValue);

  return (
    <SidebarProvider className="min-h-0">
      <Sidebar collapsible="offcanvas" className="border-r">
        <SidebarHeader className="flex-row items-center">
          <div className="flex items-center gap-2 font-medium">
            <CalendarDaysIcon />
            {t("sidebar.title")}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t("sidebar.calendar")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <Calendar
                className="w-full rounded-lg border bg-background [--cell-size:--spacing(8)]"
                mode="single"
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                  }
                }}
                selected={selectedDate}
              />
            </SidebarGroupContent>
          </SidebarGroup>

          <Separator />

          <SidebarGroup>
            <SidebarGroupLabel>{t("sidebar.categories")}</SidebarGroupLabel>
            <SidebarGroupContent className="flex flex-col gap-1.5">
              {ITINERARY_CATEGORIES.map((category) => (
                <div
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs"
                  key={category}
                >
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      CATEGORY_MARKER_CLASS[category],
                    )}
                  />
                  <span className="truncate">
                    {t(`categories.${category}`)}
                  </span>
                </div>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>

          <Separator />

          <SidebarGroup>
            <SidebarGroupLabel>{t("sidebar.upcoming")}</SidebarGroupLabel>
            <SidebarGroupContent className="flex flex-col gap-2">
              <div className="flex items-start gap-2 rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                <ListTodoIcon />
                {t("sidebar.upcomingEmpty")}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-transparent md:m-0 md:rounded-none md:shadow-none">
        <div className="mb-4 flex items-center gap-2">
          <SidebarTrigger aria-label={t("sidebar.trigger")} />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
