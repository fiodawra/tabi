"use client";

import { useTranslations } from "@/hooks/use-i18n";

export function HomePageClient() {
  const t = useTranslations("HomePage");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3">
      <h1 className="font-bold text-4xl">{t("welcome")}</h1>
      <p className="text-muted-foreground text-sm">{t("fyi")}</p>
    </main>
  );
}
