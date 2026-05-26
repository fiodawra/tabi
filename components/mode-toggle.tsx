"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useTranslations } from "@/hooks/use-i18n";
import { useThemeChange } from "@/hooks/use-theme-change";
import { Button } from "./ui/button";

export function ModeToggle() {
  const { resolvedTheme } = useTheme();
  const { changeTheme } = useThemeChange();
  const t = useTranslations("Theme");
  const isDark = resolvedTheme === "dark";

  const onToggle = () => {
    const nextTheme = isDark ? "light" : "dark";
    changeTheme(nextTheme);
  };

  return (
    <Button
      aria-label={t("toggleAriaLabel")}
      size="icon-lg"
      className="rounded-full cursor-pointer"
      onClick={onToggle}
      variant="ghost"
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
    </Button>
  );
}
