"use client";

import { format } from "date-fns";
import { enUS, id as idLocale } from "date-fns/locale";
import { CalendarIcon, ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AppLocale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

type ItineraryDateTimePickerProps = {
  description?: string;
  disabled?: boolean;
  id: string;
  label: string;
  locale: AppLocale;
  onChange: (date: Date) => void;
  value: Date;
};

type ItineraryDatePickerProps = {
  disabled?: boolean;
  id: string;
  label: string;
  locale: AppLocale;
  onChange: (date: Date) => void;
  value: Date;
};

const DATE_LOCALES = {
  en: enUS,
  id: idLocale,
  "id-x-gaul": idLocale,
} satisfies Record<AppLocale, Locale>;

type Locale = typeof enUS;

function setDatePart(value: Date, nextDate: Date) {
  const updatedDate = new Date(value);
  updatedDate.setFullYear(
    nextDate.getFullYear(),
    nextDate.getMonth(),
    nextDate.getDate(),
  );

  return updatedDate;
}

function setTimePart(value: Date, timeValue: string) {
  const [hours = "0", minutes = "0"] = timeValue.split(":");
  const updatedDate = new Date(value);
  updatedDate.setHours(Number(hours), Number(minutes), 0, 0);

  return updatedDate;
}

function createTimeOptions() {
  const options: string[] = [];

  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 15) {
      options.push(
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      );
    }
  }

  return options;
}

const TIME_OPTIONS = createTimeOptions();

function getTimeValue(value: Date) {
  return `${String(value.getHours()).padStart(2, "0")}:${String(
    value.getMinutes(),
  ).padStart(2, "0")}`;
}

export function ItineraryDateTimePicker({
  description,
  disabled = false,
  id,
  label,
  locale,
  onChange,
  value,
}: ItineraryDateTimePickerProps) {
  const dateLocale = DATE_LOCALES[locale];
  const timeValue = getTimeValue(value);
  const timeOptions = TIME_OPTIONS.includes(timeValue)
    ? TIME_OPTIONS
    : [...TIME_OPTIONS, timeValue].sort();

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              className={cn("w-full justify-start sm:flex-1")}
              disabled={disabled}
              id={id}
              type="button"
              variant="outline"
            >
              <CalendarIcon data-icon="inline-start" />
              {format(value, "PPP", { locale: dateLocale })}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              onSelect={(nextDate) => {
                if (nextDate) {
                  onChange(setDatePart(value, nextDate));
                }
              }}
              selected={value}
              locale={dateLocale}
            />
          </PopoverContent>
        </Popover>
        <Select
          disabled={disabled}
          onValueChange={(nextTime) => onChange(setTimePart(value, nextTime))}
          value={timeValue}
        >
          <SelectTrigger className="w-full sm:w-32">
            <ClockIcon data-icon="inline-start" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {timeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </div>
  );
}

export function ItineraryDatePicker({
  disabled = false,
  id,
  label,
  locale,
  onChange,
  value,
}: ItineraryDatePickerProps) {
  const dateLocale = DATE_LOCALES[locale];

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            className="w-full justify-start"
            disabled={disabled}
            id={id}
            type="button"
            variant="outline"
          >
            <CalendarIcon data-icon="inline-start" />
            {format(value, "PPP", { locale: dateLocale })}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            locale={dateLocale}
            mode="single"
            onSelect={(nextDate) => {
              if (nextDate) {
                onChange(setDatePart(value, nextDate));
              }
            }}
            selected={value}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
