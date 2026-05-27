"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFeedback } from "@/hooks/use-feedback";
import { useTranslations } from "@/hooks/use-i18n";
import { useToastOperation } from "@/hooks/use-toast-operation";
import { useUserProfile } from "@/hooks/use-user-profile";
import type { FeedbackStatus } from "@/services/feedback-service";

export function DashboardPageClient() {
  const t = useTranslations("DashboardPage");
  const router = useRouter();
  const runToastOperation = useToastOperation();
  const { profile, isProfileLoading } = useUserProfile();
  const {
    feedbackList,
    isFeedbackListLoading,
    isUpdatingFeedbackStatus,
    updateFeedbackStatus,
  } = useFeedback();

  useEffect(() => {
    if (!isProfileLoading && profile?.level !== "admin") {
      router.replace("/");
    }
  }, [isProfileLoading, profile?.level, router]);

  if (isProfileLoading || profile?.level !== "admin") {
    return null;
  }

  function handleStatusChange(feedbackId: string, status: string) {
    void runToastOperation(
      () =>
        updateFeedbackStatus({
          feedbackId,
          status: status as FeedbackStatus,
        }),
      {
        error: "feedbackStatusUpdateFailed",
        success: "feedbackStatusUpdateSuccess",
      },
    ).catch(() => undefined);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-bold text-2xl">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      {isFeedbackListLoading ? (
        <p className="text-muted-foreground text-sm">{t("loading")}</p>
      ) : feedbackList.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {feedbackList.map((feedback) => (
            <div
              className="flex flex-col gap-3 rounded-md border p-4"
              key={feedback.id}
            >
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold">{feedback.title}</h3>
                <p className="text-muted-foreground text-xs">
                  {t("submittedBy", {
                    name: feedback.userName || feedback.userId,
                  })}
                </p>
                {feedback.description ? (
                  <p className="text-muted-foreground text-sm">
                    {feedback.description}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <label
                  className="text-sm"
                  htmlFor={`feedback-status-${feedback.id}`}
                >
                  {t("status")}
                </label>
                <Select
                  disabled={isUpdatingFeedbackStatus}
                  onValueChange={(value) =>
                    handleStatusChange(feedback.id, value)
                  }
                  value={feedback.status}
                >
                  <SelectTrigger
                    className="w-44"
                    id={`feedback-status-${feedback.id}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="reviewed">
                        {t("statusReviewed")}
                      </SelectItem>
                      <SelectItem value="accepted">
                        {t("statusAccepted")}
                      </SelectItem>
                      <SelectItem value="rejected">
                        {t("statusRejected")}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
