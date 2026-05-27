"use client";

import {
  CalendarDaysIcon,
  CalendarPlusIcon,
  ListFilterIcon,
  PlusIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type NoCalendarEmptyStateProps = {
  onCreateCalendar: () => void;
  t: (key: string) => string;
};

export function NoCalendarEmptyState({
  onCreateCalendar,
  t,
}: NoCalendarEmptyStateProps) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarPlusIcon />
        </EmptyMedia>
        <EmptyTitle>{t("calendarEmpty.title")}</EmptyTitle>
        <EmptyDescription>{t("calendarEmpty.description")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onCreateCalendar} type="button">
          <CalendarPlusIcon data-icon="inline-start" />
          {t("calendarManager.create")}
        </Button>
      </EmptyContent>
    </Empty>
  );
}

type ItineraryItemsEmptyStateProps = {
  canCreate: boolean;
  hasItems: boolean;
  onCreate: () => void;
  t: (key: string) => string;
};

export function ItineraryItemsEmptyState({
  canCreate,
  hasItems,
  onCreate,
  t,
}: ItineraryItemsEmptyStateProps) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {hasItems ? <ListFilterIcon /> : <CalendarDaysIcon />}
        </EmptyMedia>
        <EmptyTitle>
          {hasItems ? t("filterEmptyTitle") : t("emptyTitle")}
        </EmptyTitle>
        <EmptyDescription>
          {hasItems ? t("filterEmptyDescription") : t("emptyDescription")}
        </EmptyDescription>
      </EmptyHeader>
      {hasItems ? null : (
        <EmptyContent>
          <Button disabled={!canCreate} onClick={onCreate} type="button">
            <PlusIcon data-icon="inline-start" />
            {t("add")}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
