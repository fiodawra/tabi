"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale, useTranslations } from "@/hooks/use-i18n";
import { useLocaleChange } from "@/hooks/use-locale-change";
import type { AppLocale } from "@/i18n/locales";

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const { changeLocale } = useLocaleChange();
  const localeLabels: Record<AppLocale, string> = {
    id: t("id"),
    en: t("en"),
    "id-x-gaul": t("gaul"),
  };

  return (
    <Select
      value={locale}
      onValueChange={(value) => changeLocale(value as AppLocale)}
    >
      <SelectTrigger aria-label={t("ariaLabel")} className="h-8 min-w-20">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {Object.entries(localeLabels).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
