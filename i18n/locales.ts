export const APP_LOCALES = ["id", "en", "id-x-gaul"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "id";
