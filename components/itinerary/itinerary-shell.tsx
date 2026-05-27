"use client";

import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useCalendars } from "@/hooks/use-calendars";
import { useLocale, useTranslations } from "@/hooks/use-i18n";
import { useItinerary } from "@/hooks/use-itinerary";
import { useItineraryCategories } from "@/hooks/use-itinerary-categories";
import { useItineraryUiStore } from "@/stores/itinerary-ui-store";
import { CategoryManagerDialog } from "./category-manager-dialog";
import { ItinerarySidebar } from "./itinerary-sidebar";
import {
  ItinerarySidebarActionsProvider,
  useItinerarySidebarActions,
} from "./itinerary-sidebar-actions";
import { readStoredDate } from "./itinerary-utils";
import { useItineraryEvents } from "./use-itinerary-events";

type ItineraryShellProps = {
  children: React.ReactNode;
};

export function ItineraryShell({ children }: ItineraryShellProps) {
  const pathname = usePathname();

  if (pathname !== "/itinerary") {
    return <>{children}</>;
  }

  return (
    <ItinerarySidebarActionsProvider>
      <ItineraryRouteShell>{children}</ItineraryRouteShell>
    </ItinerarySidebarActionsProvider>
  );
}

function ItineraryRouteShell({ children }: ItineraryShellProps) {
  const t = useTranslations("ItineraryPage");
  const locale = useLocale();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const selectedDateValue = useItineraryUiStore((state) => state.selectedDate);
  const setSelectedDate = useItineraryUiStore((state) => state.setSelectedDate);
  const selectedDate = readStoredDate(selectedDateValue);
  const {
    calendars,
    selectedCalendar,
    selectedCalendarId,
    setSelectedCalendarId,
  } = useCalendars();
  const { itineraryItems } = useItinerary(selectedCalendar);
  const {
    categories,
    createCategory,
    deleteCategory,
    isCreatingCategory,
    isDeletingCategory,
    isUpdatingCategory,
    updateCategory,
  } = useItineraryCategories(selectedCalendar);

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
  const setCategoryFilter = useItineraryUiStore(
    (state) => state.setCategoryFilter,
  );
  const setUncategorizedFilter = useItineraryUiStore(
    (state) => state.setUncategorizedFilter,
  );

  const { events, visibleCategoryIds, visibleCategoryIdSet } =
    useItineraryEvents({
      categories,
      categoryFilterIds,
      isUncategorizedFilterVisible,
      itineraryItems,
    });
  const upcomingEvents = useMemo(
    () =>
      events
        .filter((event) => event.end >= new Date())
        .sort(
          (firstEvent, secondEvent) =>
            firstEvent.start.getTime() - secondEvent.start.getTime(),
        )
        .slice(0, 5),
    [events],
  );
  const canEditSelectedCalendar =
    selectedCalendar?.access === "owner" ||
    selectedCalendar?.access === "editor";
  const canShareSelectedCalendar = selectedCalendar?.access === "owner";
  const isSavingCategory = isCreatingCategory || isUpdatingCategory;
  const sidebarActions = useItinerarySidebarActions();

  function handleCategoryFilterChange(categoryId: string, isVisible: boolean) {
    if (!selectedCalendarId) {
      return;
    }

    const nextCategoryIds = isVisible
      ? [...new Set([...visibleCategoryIds, categoryId])]
      : visibleCategoryIds.filter(
          (visibleCategoryId) => visibleCategoryId !== categoryId,
        );

    setCategoryFilter(selectedCalendarId, nextCategoryIds);
  }

  function handleUncategorizedFilterChange(isVisible: boolean) {
    if (!selectedCalendarId) {
      return;
    }

    setUncategorizedFilter(selectedCalendarId, isVisible);
  }

  return (
    <SidebarProvider className="h-svh min-h-0 overflow-hidden">
      <ItinerarySidebar
        calendars={calendars}
        canEditSelectedCalendar={canEditSelectedCalendar}
        canManageCalendars
        canShareSelectedCalendar={canShareSelectedCalendar}
        categories={categories}
        isUncategorizedFilterVisible={isUncategorizedFilterVisible}
        locale={locale}
        onCategoryFilterChange={handleCategoryFilterChange}
        onCreateItem={sidebarActions.onCreateItem}
        onOpenCalendarDialog={sidebarActions.onOpenCalendarDialog}
        onOpenCategoryManager={() => setCategoryDialogOpen(true)}
        onOpenShareDialog={sidebarActions.onOpenShareDialog}
        onSelectCalendar={setSelectedCalendarId}
        onSelectedDateChange={setSelectedDate}
        onUncategorizedFilterChange={handleUncategorizedFilterChange}
        selectedCalendar={selectedCalendar}
        selectedCalendarId={selectedCalendarId}
        selectedDate={selectedDate}
        t={t}
        upcomingEvents={upcomingEvents}
        visibleCategoryIdSet={visibleCategoryIdSet}
      />

      <SidebarInset className="h-svh min-w-0 overflow-hidden bg-transparent md:m-0 md:rounded-none md:shadow-none [&>.container]:mx-0 [&>.container]:flex [&>.container]:max-w-none [&>.container]:flex-1 [&>.container]:flex-col [&>.container]:overflow-hidden">
        {children}
      </SidebarInset>

      <CategoryManagerDialog
        canEdit={canEditSelectedCalendar}
        categories={categories}
        createCategory={createCategory}
        deleteCategory={deleteCategory}
        isDeletingCategory={isDeletingCategory}
        isSavingCategory={isSavingCategory}
        onOpenChange={setCategoryDialogOpen}
        open={categoryDialogOpen}
        t={t}
        updateCategory={updateCategory}
      />
    </SidebarProvider>
  );
}
