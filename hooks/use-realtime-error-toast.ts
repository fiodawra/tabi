"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTranslations } from "@/hooks/use-i18n";

export function useRealtimeErrorToast(error: unknown, toastKey: string) {
  const tToast = useTranslations("OperationToast");
  const lastToastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!error) {
      lastToastKey.current = null;
      return;
    }

    if (lastToastKey.current === toastKey) {
      return;
    }

    toast.error(tToast(toastKey));
    lastToastKey.current = toastKey;
  }, [error, tToast, toastKey]);
}
