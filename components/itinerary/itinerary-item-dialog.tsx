"use client";

import { MapPinIcon, Trash2Icon } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { ItineraryDateTimePicker } from "@/components/itinerary/itinerary-date-time-picker";
import { Button } from "@/components/ui/button";
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
  FieldDescription,
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
import { Textarea } from "@/components/ui/textarea";
import type { AppLocale } from "@/i18n/locales";
import type { ItineraryCategory } from "@/services/itinerary-category-service";
import { UNCATEGORIZED_VALUE } from "./itinerary-constants";
import type { CategoryLookup, ItineraryDraft } from "./itinerary-types";
import { addHours } from "./itinerary-utils";

type ItineraryItemDialogProps = {
  canEdit: boolean;
  categories: ItineraryCategory[];
  categoryMap: CategoryLookup;
  draft: ItineraryDraft;
  formError: string;
  isDeleting: boolean;
  isSaving: boolean;
  locale: AppLocale;
  onDelete: () => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  open: boolean;
  setDraft: Dispatch<SetStateAction<ItineraryDraft>>;
  t: (key: string) => string;
};

export function ItineraryItemDialog({
  canEdit,
  categories,
  categoryMap,
  draft,
  formError,
  isDeleting,
  isSaving,
  locale,
  onDelete,
  onOpenChange,
  onSubmit,
  open,
  setDraft,
  t,
}: ItineraryItemDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-xl">
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {!canEdit && draft.id
                ? t("dialog.viewTitle")
                : draft.id
                  ? t("dialog.editTitle")
                  : t("dialog.createTitle")}
            </DialogTitle>
            <DialogDescription>
              {!canEdit && draft.id
                ? t("dialog.viewDescription")
                : t("dialog.description")}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="itinerary-title">
                {t("fields.title")}
              </FieldLabel>
              <Input
                disabled={!canEdit}
                id="itinerary-title"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder={t("placeholders.title")}
                required
                value={draft.title}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <ItineraryDateTimePicker
                  disabled={!canEdit}
                  id="itinerary-start"
                  label={t("fields.start")}
                  locale={locale}
                  onChange={(startAt) =>
                    setDraft((current) => ({
                      ...current,
                      startAt,
                      endAt:
                        current.endAt <= startAt
                          ? addHours(startAt, 1)
                          : current.endAt,
                    }))
                  }
                  value={draft.startAt}
                />
              </Field>
              <Field>
                <ItineraryDateTimePicker
                  disabled={!canEdit}
                  id="itinerary-end"
                  label={t("fields.end")}
                  locale={locale}
                  onChange={(endAt) =>
                    setDraft((current) => ({ ...current, endAt }))
                  }
                  value={draft.endAt}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="itinerary-location">
                  {t("fields.location")}
                </FieldLabel>
                <Input
                  disabled={!canEdit}
                  id="itinerary-location"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  placeholder={t("placeholders.location")}
                  value={draft.location}
                />
              </Field>
              <Field>
                <FieldLabel>{t("fields.category")}</FieldLabel>
                <Select
                  disabled={!canEdit}
                  onValueChange={(category) =>
                    setDraft((current) => ({
                      ...current,
                      category:
                        category === UNCATEGORIZED_VALUE ? null : category,
                    }))
                  }
                  value={
                    draft.category && categoryMap.has(draft.category)
                      ? draft.category
                      : UNCATEGORIZED_VALUE
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={UNCATEGORIZED_VALUE}>
                        {t("category.uncategorized")}
                      </SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>{t("fields.categoryHint")}</FieldDescription>
              </Field>
            </div>
            <Field orientation="horizontal">
              <Checkbox
                checked={draft.allDay}
                disabled={!canEdit}
                id="itinerary-all-day"
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    allDay: checked === true,
                  }))
                }
              />
              <FieldContent>
                <FieldLabel htmlFor="itinerary-all-day">
                  {t("fields.allDay")}
                </FieldLabel>
                <FieldDescription>{t("fields.allDayHint")}</FieldDescription>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="itinerary-description">
                {t("fields.description")}
              </FieldLabel>
              <Textarea
                disabled={!canEdit}
                id="itinerary-description"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder={t("placeholders.description")}
                value={draft.description}
              />
            </Field>
            <FieldError>{formError}</FieldError>
          </FieldGroup>

          <DialogFooter>
            {!canEdit ? (
              <Button onClick={() => onOpenChange(false)} type="button">
                {t("close")}
              </Button>
            ) : null}
            {canEdit && draft.id ? (
              <Button
                disabled={isDeleting || isSaving}
                onClick={onDelete}
                type="button"
                variant="destructive"
              >
                {isDeleting ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Trash2Icon data-icon="inline-start" />
                )}
                {t("delete")}
              </Button>
            ) : null}
            {canEdit ? (
              <Button disabled={isDeleting || isSaving} type="submit">
                {isSaving ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <MapPinIcon data-icon="inline-start" />
                )}
                {draft.id ? t("save") : t("create")}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
