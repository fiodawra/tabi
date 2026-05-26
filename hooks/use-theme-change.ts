"use client";

import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider";
import { useTranslations } from "@/hooks/use-i18n";

type Theme = "light" | "dark" | "system";

export function useThemeChange() {
  const { setTheme } = useTheme();
  const tToast = useTranslations("ThemeToast");

  const changeTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    toast.info(
      tToast("updated", {
        theme: tToast(nextTheme),
      }),
    );
  };

  return { changeTheme };
}
