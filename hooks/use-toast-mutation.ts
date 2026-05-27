"use client";

import {
  type UseMutationOptions,
  type UseMutationResult,
  useMutation,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "@/hooks/use-i18n";

type ToastMutationKeys<TData, TError, TVariables> = {
  error?: string | ((error: TError, variables: TVariables) => false | string);
  success?: string | ((data: TData, variables: TVariables) => false | string);
};

export function useToastMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
  toastKeys: ToastMutationKeys<TData, TError, TVariables> = {},
): UseMutationResult<TData, TError, TVariables, TContext> {
  const tToast = useTranslations("OperationToast");

  return useMutation({
    ...options,
    onError: (error, variables, context, mutation) => {
      const errorKey =
        typeof toastKeys.error === "function"
          ? toastKeys.error(error, variables)
          : toastKeys.error;

      if (errorKey) {
        toast.error(tToast(errorKey));
      }

      options.onError?.(error, variables, context, mutation);
    },
    onSuccess: (data, variables, context, mutation) => {
      const successKey =
        typeof toastKeys.success === "function"
          ? toastKeys.success(data, variables)
          : toastKeys.success;

      if (successKey) {
        toast.success(tToast(successKey));
      }

      options.onSuccess?.(data, variables, context, mutation);
    },
  });
}
