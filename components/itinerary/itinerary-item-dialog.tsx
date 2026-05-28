"use client";

import { MapPinIcon, Trash2Icon } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import {
  ItineraryDatePicker,
  ItineraryDateTimePicker,
} from "@/components/itinerary/itinerary-date-time-picker";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { AppLocale } from "@/i18n/locales";
import type { ItineraryCategory } from "@/services/itinerary-category-service";
import type {
  ItineraryRecurrence,
  RecurrenceFrequency,
  RecurrencePreset,
} from "@/services/itinerary-service";
import { UNCATEGORIZED_VALUE } from "./itinerary-constants";
import {
  CUSTOM_RECURRENCE_FREQUENCIES,
  getDefaultCustomRecurrence,
  getRecurrenceForPreset,
  getRecurrencePreset,
  RECURRENCE_PRESETS,
  WEEKDAYS,
} from "./itinerary-recurrence";
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

function CategorySelectOption({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className="size-3 shrink-0 rounded-full ring-1 ring-foreground/10"
        style={{ backgroundColor: color }}
      />
      <span className="truncate">{label}</span>
    </span>
  );
}

function getCustomRecurrence(
  recurrence: ItineraryRecurrence | null,
  startAt: Date,
) {
  return recurrence?.preset === "custom"
    ? recurrence
    : getDefaultCustomRecurrence(startAt);
}

function toPositiveInteger(value: string, fallback: number) {
  const nextValue = Number(value);

  return Number.isFinite(nextValue)
    ? Math.max(1, Math.floor(nextValue))
    : fallback;
}

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
  const recurrencePreset = getRecurrencePreset(draft.recurrence);
  const customRecurrence = getCustomRecurrence(draft.recurrence, draft.startAt);

  function updateCustomRecurrence(
    getNextRecurrence: (
      currentRecurrence: ItineraryRecurrence,
    ) => ItineraryRecurrence,
  ) {
    setDraft((current) => {
      const currentRecurrence = getCustomRecurrence(
        current.recurrence,
        current.startAt,
      );

      return {
        ...current,
        recurrence: getNextRecurrence(currentRecurrence),
      };
    });
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-hidden p-0 sm:max-w-2xl lg:max-w-5xl">
        <form
          className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]"
          onSubmit={onSubmit}
        >
          <DialogHeader className="border-b p-4 pr-12">
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

          <div className="min-h-0 overflow-y-auto p-4">
            <FieldGroup className="gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.85fr)] lg:items-start">
              <div className="flex min-w-0 flex-col gap-4">
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
                            <CategorySelectOption
                              color="var(--muted-foreground)"
                              label={t("category.uncategorized")}
                            />
                          </SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <CategorySelectOption
                                color={category.color}
                                label={category.name}
                              />
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      {t("fields.categoryHint")}
                    </FieldDescription>
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
                    <FieldDescription>
                      {t("fields.allDayHint")}
                    </FieldDescription>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="itinerary-description">
                    {t("fields.description")}
                  </FieldLabel>
                  <Textarea
                    className="min-h-24"
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
              </div>

              <div className="flex min-w-0 flex-col gap-4">
                <Field>
                  <FieldLabel>{t("recurrence.label")}</FieldLabel>
                  <Select
                    disabled={!canEdit}
                    onValueChange={(preset) =>
                      setDraft((current) => ({
                        ...current,
                        recurrence: getRecurrenceForPreset(
                          preset as RecurrencePreset,
                          current.startAt,
                        ),
                      }))
                    }
                    value={recurrencePreset}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {RECURRENCE_PRESETS.map((preset) => (
                          <SelectItem key={preset} value={preset}>
                            {t(`recurrence.presets.${preset}`)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>{t("recurrence.hint")}</FieldDescription>
                </Field>

                {recurrencePreset === "custom" ? (
                  <div className="grid gap-4 rounded-md border p-3">
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <Field>
                        <FieldLabel htmlFor="itinerary-repeat-every">
                          {t("recurrence.repeatEvery")}
                        </FieldLabel>
                        <Input
                          disabled={!canEdit}
                          id="itinerary-repeat-every"
                          min={1}
                          onChange={(event) =>
                            updateCustomRecurrence((current) => ({
                              ...current,
                              repeatEvery: toPositiveInteger(
                                event.target.value,
                                current.repeatEvery ?? 1,
                              ),
                            }))
                          }
                          type="number"
                          value={customRecurrence.repeatEvery ?? 1}
                        />
                      </Field>
                      <Field>
                        <FieldLabel>{t("recurrence.frequency")}</FieldLabel>
                        <Select
                          disabled={!canEdit}
                          onValueChange={(frequency) =>
                            updateCustomRecurrence((current) => ({
                              ...current,
                              frequency: frequency as RecurrenceFrequency,
                              weekdays:
                                frequency === "week"
                                  ? (current.weekdays ?? [
                                      draft.startAt.getDay(),
                                    ])
                                  : current.weekdays,
                            }))
                          }
                          value={customRecurrence.frequency ?? "week"}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {CUSTOM_RECURRENCE_FREQUENCIES.map(
                                (frequency) => (
                                  <SelectItem key={frequency} value={frequency}>
                                    {t(`recurrence.frequencies.${frequency}`)}
                                  </SelectItem>
                                ),
                              )}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    {(customRecurrence.frequency ?? "week") === "week" ? (
                      <Field>
                        <FieldLabel>{t("recurrence.repeatOn")}</FieldLabel>
                        <ToggleGroup
                          className="flex-wrap"
                          disabled={!canEdit}
                          onValueChange={(values) =>
                            updateCustomRecurrence((current) => ({
                              ...current,
                              weekdays:
                                values.length > 0
                                  ? values.map(Number).sort()
                                  : [draft.startAt.getDay()],
                            }))
                          }
                          type="multiple"
                          value={(
                            customRecurrence.weekdays ?? [
                              draft.startAt.getDay(),
                            ]
                          ).map(String)}
                          variant="outline"
                        >
                          {WEEKDAYS.map((weekday) => (
                            <ToggleGroupItem
                              key={weekday}
                              value={String(weekday)}
                            >
                              {t(`recurrence.weekdays.${weekday}`)}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </Field>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <Field>
                        <FieldLabel>{t("recurrence.end")}</FieldLabel>
                        <Select
                          disabled={!canEdit}
                          onValueChange={(mode) =>
                            updateCustomRecurrence((current) => ({
                              ...current,
                              end:
                                mode === "onDate"
                                  ? {
                                      date:
                                        current.end.mode === "onDate"
                                          ? current.end.date
                                          : draft.startAt,
                                      mode: "onDate",
                                    }
                                  : mode === "afterCount"
                                    ? {
                                        count:
                                          current.end.mode === "afterCount"
                                            ? current.end.count
                                            : 1,
                                        mode: "afterCount",
                                      }
                                    : { mode: "never" },
                            }))
                          }
                          value={customRecurrence.end.mode}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="never">
                                {t("recurrence.ends.never")}
                              </SelectItem>
                              <SelectItem value="onDate">
                                {t("recurrence.ends.onDate")}
                              </SelectItem>
                              <SelectItem value="afterCount">
                                {t("recurrence.ends.afterCount")}
                              </SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                      {customRecurrence.end.mode === "onDate" ? (
                        <Field>
                          <ItineraryDatePicker
                            disabled={!canEdit}
                            id="itinerary-repeat-until"
                            label={t("recurrence.untilDate")}
                            locale={locale}
                            onChange={(date) =>
                              updateCustomRecurrence((current) => ({
                                ...current,
                                end: {
                                  date,
                                  mode: "onDate",
                                },
                              }))
                            }
                            value={customRecurrence.end.date}
                          />
                        </Field>
                      ) : null}
                      {customRecurrence.end.mode === "afterCount" ? (
                        <Field>
                          <FieldLabel htmlFor="itinerary-repeat-count">
                            {t("recurrence.afterCount")}
                          </FieldLabel>
                          <Input
                            disabled={!canEdit}
                            id="itinerary-repeat-count"
                            min={1}
                            onChange={(event) =>
                              updateCustomRecurrence((current) => ({
                                ...current,
                                end: {
                                  count: toPositiveInteger(
                                    event.target.value,
                                    current.end.mode === "afterCount"
                                      ? current.end.count
                                      : 1,
                                  ),
                                  mode: "afterCount",
                                },
                              }))
                            }
                            type="number"
                            value={customRecurrence.end.count}
                          />
                        </Field>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <FieldError className="lg:col-span-2">{formError}</FieldError>
            </FieldGroup>
          </div>

          <DialogFooter className="border-t p-4">
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
