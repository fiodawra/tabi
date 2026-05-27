"use client";

import { CalendarPlusIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { CalendarSummary } from "@/services/calendar-sharing-service";
import { getCalendarLabel } from "./itinerary-utils";

type CalendarManagerDialogProps = {
  archivedCalendars: CalendarSummary[];
  calendarDescription: string;
  calendarError: string;
  calendarTitle: string;
  editingCalendarId: string | null;
  isDeletingCalendar: boolean;
  isSavingCalendar: boolean;
  onCancelEdit: () => void;
  onDeleteCalendar: (calendarId: string) => void;
  onOpenChange: (open: boolean) => void;
  onStartCalendarEdit: (calendar: CalendarSummary) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  open: boolean;
  ownedCalendars: CalendarSummary[];
  setCalendarDescription: (description: string) => void;
  setCalendarError: (error: string) => void;
  setCalendarTitle: (title: string) => void;
  t: (key: string) => string;
};

export function CalendarManagerDialog({
  archivedCalendars,
  calendarDescription,
  calendarError,
  calendarTitle,
  editingCalendarId,
  isDeletingCalendar,
  isSavingCalendar,
  onCancelEdit,
  onDeleteCalendar,
  onOpenChange,
  onStartCalendarEdit,
  onSubmit,
  open,
  ownedCalendars,
  setCalendarDescription,
  setCalendarError,
  setCalendarTitle,
  t,
}: CalendarManagerDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("calendarManager.title")}</DialogTitle>
          <DialogDescription>
            {t("calendarManager.description")}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="calendar-title">
                {t("calendarManager.titleField")}
              </FieldLabel>
              <Input
                disabled={isSavingCalendar}
                id="calendar-title"
                onChange={(event) => {
                  setCalendarTitle(event.target.value);
                  setCalendarError("");
                }}
                placeholder={t("calendarManager.titlePlaceholder")}
                value={calendarTitle}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="calendar-description">
                {t("calendarManager.descriptionField")}
              </FieldLabel>
              <Textarea
                disabled={isSavingCalendar}
                id="calendar-description"
                onChange={(event) => setCalendarDescription(event.target.value)}
                placeholder={t("calendarManager.descriptionPlaceholder")}
                value={calendarDescription}
              />
            </Field>
            <FieldError>{calendarError}</FieldError>
          </FieldGroup>
          <DialogFooter>
            {editingCalendarId ? (
              <Button onClick={onCancelEdit} type="button" variant="ghost">
                {t("calendarManager.cancelEdit")}
              </Button>
            ) : null}
            <Button disabled={isSavingCalendar} type="submit">
              {isSavingCalendar ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <CalendarPlusIcon data-icon="inline-start" />
              )}
              {editingCalendarId
                ? t("calendarManager.save")
                : t("calendarManager.create")}
            </Button>
          </DialogFooter>
        </form>

        <div className="flex flex-col gap-2">
          <h3 className="font-medium text-sm">
            {t("calendarManager.yourCalendars")}
          </h3>
          <div className="flex flex-col gap-2">
            {ownedCalendars.map((calendar) => (
              <div
                className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                key={calendar.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">
                    {getCalendarLabel(calendar, t)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {calendar.description || calendar.ownerEmail}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    disabled={isDeletingCalendar || isSavingCalendar}
                    onClick={() => onStartCalendarEdit(calendar)}
                    type="button"
                    variant="outline"
                  >
                    <PencilIcon data-icon="inline-start" />
                    {t("calendarManager.edit")}
                  </Button>
                  <Button
                    disabled={isDeletingCalendar || isSavingCalendar}
                    onClick={() => onDeleteCalendar(calendar.id)}
                    type="button"
                    variant="destructive"
                  >
                    {isDeletingCalendar ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <Trash2Icon data-icon="inline-start" />
                    )}
                    {t("calendarManager.delete")}
                  </Button>
                </div>
              </div>
            ))}
            {ownedCalendars.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-muted-foreground text-sm">
                {t("calendarManager.empty")}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-medium text-sm">
            {t("calendarManager.archived")}
          </h3>
          {archivedCalendars.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-muted-foreground text-sm">
              {t("calendarManager.archivedEmpty")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {archivedCalendars.map((calendar) => (
                <div
                  className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  key={calendar.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">
                      {getCalendarLabel(calendar, t)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {calendar.description || calendar.ownerEmail}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {t("calendarManager.archivedBadge")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
