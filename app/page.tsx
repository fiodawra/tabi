"use client";

import { useTranslations } from "@/hooks/use-i18n";

export default function Home() {
  const t = useTranslations("HomePage");

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-3">
      <h1 className="text-4xl font-bold">{t("welcome")}</h1>
      <p className="text-sm text-muted-foreground">{t("fyi")}</p>
    </main>
  );
}
