"use client";

import enMessages from "@/messages/en.json";
import idMessages from "@/messages/id.json";
import gaulMessages from "@/messages/id-x-gaul.json";
import { DEFAULT_LOCALE, type AppLocale } from "@/i18n/locales";
import { useLocaleStore } from "@/stores/locale-store";

type MessageValue = string | MessageMap;
interface MessageMap {
  [key: string]: MessageValue;
}

const MESSAGES: Record<AppLocale, MessageMap> = {
  en: enMessages,
  id: idMessages,
  "id-x-gaul": gaulMessages,
};

function readNestedValue(source: MessageMap, path: string): MessageValue | null {
  const steps = path.split(".");
  let current: MessageValue = source;

  for (const step of steps) {
    if (typeof current !== "object" || current === null || !(step in current)) {
      return null;
    }
    current = current[step] as MessageValue;
  }

  return current;
}

function formatTemplate(
  template: string,
  values?: Record<string, string | number>,
): string {
  if (!values) {
    return template;
  }

  return template.replaceAll(/\{(\w+)\}/g, (_match, key) =>
    String(values[key] ?? `{${key}}`),
  );
}

export function useLocale() {
  return useLocaleStore((state) => state.locale);
}

export function useSetLocale() {
  return useLocaleStore((state) => state.setLocale);
}

export function useTranslations(namespace: string) {
  const locale = useLocaleStore((state) => state.locale);
  const localeMessages = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];

  return (key: string, values?: Record<string, string | number>) => {
    const result = readNestedValue(localeMessages, `${namespace}.${key}`);
    if (typeof result !== "string") {
      return `${namespace}.${key}`;
    }
    return formatTemplate(result, values);
  };
}
