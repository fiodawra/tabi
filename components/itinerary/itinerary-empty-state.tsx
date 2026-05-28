"use client";

import { CalendarPlusIcon } from "lucide-react";
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
