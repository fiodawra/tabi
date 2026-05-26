"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "@/hooks/use-i18n";
import { useFeedback } from "@/hooks/use-feedback";
import { useUserProfile } from "@/hooks/use-user-profile";
import type { FeedbackStatus } from "@/services/feedback-service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DashboardPage() {
  const t = useTranslations("DashboardPage");
  const tToast = useTranslations("OperationToast");
  const router = useRouter();
  const { profile, isProfileLoading } = useUserProfile();
  const {
    feedbackList,
    isFeedbackListLoading,
    updateFeedbackStatus,
    isUpdatingFeedbackStatus,
  } = useFeedback();

  useEffect(() => {
    if (isProfileLoading) {
      return;
    }

    if (profile?.level !== "admin") {
      router.replace("/");
    }
  }, [isProfileLoading, profile?.level, router]);

  if (isProfileLoading || profile?.level !== "admin") {
    return null;
  }

  async function handleStatusChange(feedbackId: string, status: string) {
    try {
      await updateFeedbackStatus({
        feedbackId,
        status: status as FeedbackStatus,
      });
      toast.success(tToast("feedbackStatusUpdateSuccess"));
    } catch {
      toast.error(tToast("feedbackStatusUpdateFailed"));
    }
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-bold">{t("title")}</h2>
      <p className="text-sm text-muted-foreground">{t("description")}</p>

      {isFeedbackListLoading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : feedbackList.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="space-y-3">
          {feedbackList.map((feedback) => (
            <div
              key={feedback.id}
              className="rounded-md border p-4 flex flex-col gap-3"
            >
              <div className="space-y-1">
                <h3 className="font-semibold">{feedback.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {t("submittedBy", {
                    name: feedback.userName || feedback.userId,
                  })}
                </p>
                {feedback.description ? (
                  <p className="text-sm text-muted-foreground">
                    {feedback.description}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor={`feedback-status-${feedback.id}`}
                  className="text-sm"
                >
                  {t("status")}
                </label>
                <Select
                  value={feedback.status}
                  onValueChange={(value) =>
                    void handleStatusChange(feedback.id, value)
                  }
                  disabled={isUpdatingFeedbackStatus}
                >
                  <SelectTrigger
                    id={`feedback-status-${feedback.id}`}
                    className="w-44"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reviewed">
                      {t("statusReviewed")}
                    </SelectItem>
                    <SelectItem value="accepted">
                      {t("statusAccepted")}
                    </SelectItem>
                    <SelectItem value="rejected">
                      {t("statusRejected")}
                    </SelectItem>
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
