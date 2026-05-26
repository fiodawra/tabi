"use client";

import {
  formatForDisplay,
  type RegisterableHotkey,
  useHotkeys,
} from "@tanstack/react-hotkeys";
import {
  GridIcon,
  HomeIcon,
  LanguagesIcon,
  type LucideIcon,
  MonitorIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useLocale, useTranslations } from "@/hooks/use-i18n";
import { useLocaleChange } from "@/hooks/use-locale-change";
import { useThemeChange } from "@/hooks/use-theme-change";
import type { AppLocale } from "@/i18n/locales";
import { useTheme } from "./theme-provider";

type CommandItemConfig = {
  disabled?: boolean;
  id?: string;
  icon?: LucideIcon;
  label: string;
  onClick: () => void;
  shortcut?: RegisterableHotkey;
};

type CommandGroupConfig = {
  items: Array<CommandItemConfig>;
  label: string;
};

export function HeaderSearch() {
  const t = useTranslations("HeaderSearch");
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const { changeLocale } = useLocaleChange();
  const { changeTheme } = useThemeChange();
  const { theme } = useTheme();
  const router = useRouter();

  const goTo = (href: string) => {
    router.push(href);
    setOpen(false);
  };
  const runCommand = (action: () => void) => {
    action();
    setOpen(false);
  };
  const switchLocale = (nextLocale: AppLocale) => {
    changeLocale(nextLocale);
    setOpen(false);
  };

  const OPEN_SEARCH_SHORTCUT: RegisterableHotkey = { ctrl: true, key: "f" };
  const COMMAND_ITEMS: Array<CommandGroupConfig> = [
    {
      label: t("group.navigation"),
      items: [
        {
          icon: HomeIcon,
          label: t("item.goHome"),
          onClick: () => goTo("/"),
          shortcut: { key: "h", ctrl: true, alt: true },
        },
        {
          icon: GridIcon,
          label: t("item.goDashboard"),
          onClick: () => goTo("/dashboard"),
        },
        {
          icon: GridIcon,
          label: t("item.goFeedback"),
          onClick: () => goTo("/feedback"),
        },
      ],
    },
    {
      label: t("group.theme"),
      items: [
        {
          icon: MoonIcon,
          label: t("item.darkMode"),
          disabled: theme === "dark",
          onClick: () => changeTheme("dark"),
          shortcut: { key: "d", ctrl: true, alt: true },
        },
        {
          icon: SunIcon,
          label: t("item.lightMode"),
          disabled: theme === "light",
          onClick: () => changeTheme("light"),
          shortcut: { key: "l", ctrl: true, alt: true },
        },
        {
          icon: MonitorIcon,
          label: t("item.systemMode"),
          disabled: theme === "system",
          onClick: () => changeTheme("system"),
          shortcut: { key: "s", ctrl: true, alt: true },
        },
      ],
    },
    {
      label: t("group.language"),
      items: [
        {
          id: "switch-id",
          icon: LanguagesIcon,
          label: t("item.switchToId"),
          disabled: locale === "id",
          onClick: () => switchLocale("id"),
          shortcut: { key: "1", ctrl: true, alt: true },
        },
        {
          id: "switch-en",
          icon: LanguagesIcon,
          label: t("item.switchToEn"),
          disabled: locale === "en",
          onClick: () => switchLocale("en"),
          shortcut: { key: "2", ctrl: true, alt: true },
        },
        {
          id: "switch-gaul",
          icon: LanguagesIcon,
          label: t("item.switchToGaul"),
          disabled: locale === "id-x-gaul",
          onClick: () => switchLocale("id-x-gaul"),
          shortcut: { key: "3", ctrl: true, alt: true },
        },
      ],
    },
  ];

  const commandHotkeys = COMMAND_ITEMS.flatMap((group) =>
    group.items
      .filter((item) => item.shortcut && !item.disabled)
      .map((item) => ({
        hotkey: item.shortcut as RegisterableHotkey,
        callback: () => runCommand(item.onClick),
      })),
  );

  useHotkeys([
    {
      hotkey: OPEN_SEARCH_SHORTCUT,
      callback: () => setOpen((current) => !current),
    },
    ...commandHotkeys,
  ]);

  return (
    <>
      <Button
        aria-label={t("openAriaLabel")}
        className="flex items-center gap-2"
        onClick={() => setOpen(true)}
        size="lg"
        variant="ghost"
      >
        <SearchIcon data-icon="inline-start" />
        {t("button")}
        <CommandShortcut>
          {formatForDisplay(OPEN_SEARCH_SHORTCUT)}
        </CommandShortcut>
      </Button>
      <CommandDialog
        description={t("dialog.description")}
        onOpenChange={setOpen}
        open={open}
        title={t("dialog.title")}
      >
        <Command>
          <CommandInput placeholder={t("dialog.placeholder")} />
          <CommandList>
            <CommandEmpty>{t("dialog.empty")}</CommandEmpty>
            {COMMAND_ITEMS.map((group, groupIndex) => (
              <div key={group.label}>
                {groupIndex > 0 ? <CommandSeparator /> : null}
                <CommandGroup heading={group.label}>
                  {group.items.map((item) => (
                    <CommandItem
                      key={item.label}
                      disabled={item.disabled}
                      onSelect={() => runCommand(item.onClick)}
                    >
                      {item.icon ? <item.icon /> : null}
                      {item.label}
                      {item.shortcut ? (
                        <CommandShortcut>
                          {formatForDisplay(item.shortcut)}
                        </CommandShortcut>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
