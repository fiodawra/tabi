"use client";

import { Share2Icon } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type {
  CalendarRole,
  CalendarShare,
} from "@/services/calendar-sharing-service";
import { CALENDAR_ROLES } from "./itinerary-constants";

type CalendarShareDialogProps = {
  isRevokingCalendarShare: boolean;
  isSharingCalendar: boolean;
  isUpdatingCalendarShareRole: boolean;
  onOpenChange: (open: boolean) => void;
  onRevokeShare: (shareId: string) => void;
  onShareEmailChange: (email: string) => void;
  onShareErrorChange: (error: string) => void;
  onShareRoleChange: (shareId: string, role: CalendarRole) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  open: boolean;
  selectedCalendarOutgoingShares: CalendarShare[];
  shareEmail: string;
  shareError: string;
  shareRole: CalendarRole;
  setShareRole: (role: CalendarRole) => void;
  t: (key: string) => string;
};

export function CalendarShareDialog({
  isRevokingCalendarShare,
  isSharingCalendar,
  isUpdatingCalendarShareRole,
  onOpenChange,
  onRevokeShare,
  onShareEmailChange,
  onShareErrorChange,
  onShareRoleChange,
  onSubmit,
  open,
  selectedCalendarOutgoingShares,
  shareEmail,
  shareError,
  shareRole,
  setShareRole,
  t,
}: CalendarShareDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("share.title")}</DialogTitle>
          <DialogDescription>{t("share.description")}</DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <FieldGroup>
            <div className="grid gap-4 md:grid-cols-[1fr_9rem]">
              <Field>
                <FieldLabel htmlFor="calendar-share-email">
                  {t("share.email")}
                </FieldLabel>
                <Input
                  disabled={isSharingCalendar}
                  id="calendar-share-email"
                  onChange={(event) => {
                    onShareEmailChange(event.target.value);
                    onShareErrorChange("");
                  }}
                  placeholder={t("share.emailPlaceholder")}
                  type="email"
                  value={shareEmail}
                />
              </Field>
              <Field>
                <FieldLabel>{t("share.role")}</FieldLabel>
                <Select
                  disabled={isSharingCalendar}
                  onValueChange={(role) => setShareRole(role as CalendarRole)}
                  value={shareRole}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {CALENDAR_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {t(`access.${role}`)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <FieldError>{shareError}</FieldError>
          </FieldGroup>

          <DialogFooter>
            <Button disabled={isSharingCalendar} type="submit">
              {isSharingCalendar ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Share2Icon data-icon="inline-start" />
              )}
              {t("share.submit")}
            </Button>
          </DialogFooter>
        </form>

        <div className="flex flex-col gap-2">
          <h3 className="font-medium text-sm">{t("share.sharedWith")}</h3>
          {selectedCalendarOutgoingShares.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-muted-foreground text-sm">
              {t("share.empty")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedCalendarOutgoingShares.map((share) => (
                <div
                  className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  key={share.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">
                      {share.recipientEmail}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t(`access.${share.role}`)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      disabled={isUpdatingCalendarShareRole}
                      onValueChange={(role) =>
                        onShareRoleChange(share.id, role as CalendarRole)
                      }
                      value={share.role}
                    >
                      <SelectTrigger
                        aria-label={t("share.role")}
                        className="w-28"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {CALENDAR_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {t(`access.${role}`)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Button
                      disabled={isRevokingCalendarShare}
                      onClick={() => onRevokeShare(share.id)}
                      type="button"
                      variant="ghost"
                    >
                      {t("share.revoke")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
