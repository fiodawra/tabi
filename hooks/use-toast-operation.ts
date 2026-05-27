"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "@/hooks/use-i18n";

type ToastKey = false | string;

type ToastOperationOptions<T> = {
  error?: ToastKey | ((error: unknown) => ToastKey);
  onError?: (error: unknown) => void;
  onSuccess?: (result: T) => void;
  success?: ToastKey | ((result: T) => ToastKey);
};

export function useToastOperation() {
  const tToast = useTranslations("OperationToast");

  return useCallback(
    async <T>(
      operation: () => Promise<T>,
      options: ToastOperationOptions<T> = {},
    ) => {
      try {
        const result = await operation();
        const successKey =
          typeof options.success === "function"
            ? options.success(result)
            : options.success;

        if (successKey) {
          toast.success(tToast(successKey));
        }

        options.onSuccess?.(result);
        return result;
      } catch (error) {
        const errorKey =
          typeof options.error === "function"
            ? options.error(error)
            : options.error;

        if (errorKey) {
          toast.error(tToast(errorKey));
        }

        options.onError?.(error);
        throw error;
      }
    },
    [tToast],
  );
}
