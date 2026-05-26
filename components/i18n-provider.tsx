"use client";

import { useEffect } from "react";
import { useLocaleStore } from "@/stores/locale-store";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocaleStore((state) => state.locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <>{children}</>;
}
