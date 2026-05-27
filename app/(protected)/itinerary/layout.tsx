"use client";

import { format } from "date-fns";
import { enUS, id as idLocale } from "date-fns/locale";
import {
  CalendarDaysIcon,
  PencilIcon,
  PlusIcon,
  TagsIcon,
  Trash2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { useCalendars } from "@/hooks/use-calendars";
import { useLocale, useTranslations } from "@/hooks/use-i18n";
import { useItinerary } from "@/hooks/use-itinerary";
import { useItineraryCategories } from "@/hooks/use-itinerary-categories";
import type { CalendarSummary } from "@/services/calendar-sharing-service";
import {
  type ItineraryCategory,
  ItineraryCategoryError,
} from "@/services/itinerary-category-service";
import type { ItineraryItem } from "@/services/itinerary-service";
import { useItineraryUiStore } from "@/stores/itinerary-ui-store";

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

function readStoredDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getCalendarLabel(
  calendar: CalendarSummary,
  t: ReturnType<typeof useTranslations>,
) {
  return calendar.label || calendar.ownerEmail || t("calendarSelector.shared");
}

function getCategoryErrorMessage(
  error: unknown,
  t: ReturnType<typeof useTranslations>,
) {
  if (error instanceof ItineraryCategoryError) {
    return t(`categoryManager.errors.${error.code}`);
  }

  return t("categoryManager.errors.generic");
}

export default function ItineraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("ItineraryPage");
  const tToast = useTranslations("OperationToast");
  const locale = useLocale();
  const dateLocale = locale === "en" ? enUS : idLocale;

  const selectedDateValue = useItineraryUiStore((state) => state.selectedDate);
  const setSelectedDate = useItineraryUiStore((state) => state.setSelectedDate);
  const selectedDate = readStoredDate(selectedDateValue);

  const { selectedCalendar, selectedCalendarId } = useCalendars();
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

  const DEFAULT_EVENT_COLOR = "var(--muted-foreground)";

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

  const canEditSelectedCalendar =
    selectedCalendar?.access === "owner" ||
    selectedCalendar?.access === "editor";

  // Category Manager dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState("#2563eb");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );

  const isSavingCategory = isCreatingCategory || isUpdatingCategory;

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

  return (
    <SidebarProvider className="min-h-0">
      <Sidebar
        collapsible="offcanvas"
        className="border-r"
      >
        <SidebarHeader className="flex-row items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <CalendarDaysIcon className="size-4 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="truncate">{t("sidebar.title")}</span>
              {selectedCalendar ? (
                <span className="truncate text-[10px] font-normal text-muted-foreground">
                  {getCalendarLabel(selectedCalendar, t)}
                </span>
              ) : null}
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="gap-2 py-2">
          <SidebarGroup>
            <SidebarGroupLabel className="font-semibold text-xs text-muted-foreground/80 px-2 py-1">
              {t("sidebar.calendar")}
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-1">
              <Calendar
                className="w-full rounded-lg border bg-background "
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

          {selectedCalendar ? (
            <>
              <SidebarGroup className="relative">
                <SidebarGroupLabel className="font-semibold text-xs text-muted-foreground/80 px-2 py-1 flex items-center justify-between">
                  <span>{t("sidebar.categories")}</span>
                </SidebarGroupLabel>
                {canEditSelectedCalendar ? (
                  <SidebarGroupAction
                    onClick={() => {
                      setCategoryColor("#2563eb");
                      setCategoryError("");
                      setCategoryName("");
                      setEditingCategoryId(null);
                      setCategoryDialogOpen(true);
                    }}
                    title={t("categoryManager.open")}
                  >
                    <TagsIcon />
                  </SidebarGroupAction>
                ) : null}
                <SidebarGroupContent className="px-2 py-1">
                  <FieldGroup
                    data-slot="checkbox-group"
                    className="flex flex-col gap-1"
                  >
                    {categories.map((category) => {
                      const isChecked = visibleCategoryIdSet.has(category.id);
                      return (
                        <div
                          key={category.id}
                          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-sidebar-accent/50 group/item transition-all duration-150 cursor-pointer select-none"
                          onClick={() =>
                            handleCategoryFilterChange(category.id, !isChecked)
                          }
                        >
                          <Checkbox
                            checked={isChecked}
                            id={`category-filter-${category.id}`}
                            onCheckedChange={(checked) =>
                              handleCategoryFilterChange(
                                category.id,
                                checked === true,
                              )
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="transition-transform duration-100 group-hover/item:scale-105"
                          />
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              aria-hidden
                              className="size-2 shrink-0 rounded-full transition-transform duration-150 group-hover/item:scale-110"
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="truncate text-xs font-medium text-foreground/80 group-hover/item:text-foreground transition-colors duration-150">
                              {category.name}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div
                      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-sidebar-accent/50 group/item transition-all duration-150 cursor-pointer select-none"
                      onClick={() =>
                        handleUncategorizedFilterChange(
                          !isUncategorizedFilterVisible,
                        )
                      }
                    >
                      <Checkbox
                        checked={isUncategorizedFilterVisible}
                        id="category-filter-uncategorized"
                        onCheckedChange={(checked) =>
                          handleUncategorizedFilterChange(checked === true)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="transition-transform duration-100 group-hover/item:scale-105"
                      />
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          aria-hidden
                          className="size-2 shrink-0 rounded-full bg-muted-foreground transition-transform duration-150 group-hover/item:scale-110"
                        />
                        <span className="truncate text-xs font-medium text-foreground/80 group-hover/item:text-foreground transition-colors duration-150">
                          {t("category.uncategorized")}
                        </span>
                      </div>
                    </div>
                  </FieldGroup>

                  {categories.length === 0 ? (
                    <p className="rounded-md border border-dashed p-3 mt-1 text-center text-xs text-muted-foreground animate-pulse">
                      {t("sidebar.categoriesEmpty")}
                    </p>
                  ) : null}
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup>
                <SidebarGroupLabel className="font-semibold text-xs text-muted-foreground/80 px-2 py-1">
                  {t("sidebar.upcoming")}
                </SidebarGroupLabel>
                <SidebarGroupContent className="px-2 py-1">
                  {upcomingEvents.length === 0 ? (
                    <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                      {t("sidebar.upcomingEmpty")}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {upcomingEvents.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => setSelectedDate(event.start)}
                          className="flex w-full text-left min-w-0 gap-2.5 rounded-md border bg-muted/20 hover:bg-sidebar-accent/80 hover:border-sidebar-border hover:shadow-sm hover:translate-x-0.5 active:scale-[0.98] transition-all duration-200 p-2 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <span
                            aria-hidden
                            className="mt-1.5 size-2 shrink-0 rounded-full"
                            style={{
                              backgroundColor:
                                event.categoryColor ?? DEFAULT_EVENT_COLOR,
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-foreground/90">
                              {event.title}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {format(event.start, "MMM d, HH:mm", {
                                locale: dateLocale,
                              })}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          ) : null}
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-transparent md:m-0 md:rounded-none md:shadow-none">
        {children}
      </SidebarInset>

      <Dialog
        onOpenChange={setCategoryDialogOpen}
        open={categoryDialogOpen}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("categoryManager.title")}</DialogTitle>
            <DialogDescription>
              {t("categoryManager.description")}
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex flex-col gap-4"
            onSubmit={handleCategorySubmit}
          >
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
    </SidebarProvider>
  );
}
