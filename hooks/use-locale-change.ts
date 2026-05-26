"use client";

import { toast } from "sonner";
import type { AppLocale } from "@/i18n/locales";
import { useSetLocale, useTranslations } from "@/hooks/use-i18n";

export function useLocaleChange() {
  const setLocale = useSetLocale();
  const tToast = useTranslations("LocaleToast");

  const changeLocale = (nextLocale: AppLocale) => {
    setLocale(nextLocale);
    toast.info(
      tToast("updated", {
        locale: tToast(nextLocale),
      }),
    );
  };

  return { changeLocale };
}
