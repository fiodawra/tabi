"use client";

import { CalendarDaysIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
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
import { useItineraryUiStore } from "@/stores/itinerary-ui-store";

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
