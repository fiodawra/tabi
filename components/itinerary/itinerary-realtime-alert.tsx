"use client";

type ItineraryRealtimeAlertProps = {
  calendarsRealtimeError: unknown;
  itineraryRealtimeError: unknown;
  t: (key: string) => string;
};

export function ItineraryRealtimeAlert({
  calendarsRealtimeError,
  itineraryRealtimeError,
  t,
}: ItineraryRealtimeAlertProps) {
  if (!itineraryRealtimeError && !calendarsRealtimeError) {
    return null;
  }

  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive text-sm">
      {itineraryRealtimeError ? t("realtimeError") : t("share.realtimeError")}
    </div>
  );
}
