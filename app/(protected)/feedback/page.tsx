"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "@/hooks/use-i18n";
import { useFeedback } from "@/hooks/use-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function FeedbackPage() {
  const t = useTranslations("FeedbackPage");
  const tToast = useTranslations("OperationToast");
  const { createFeedback, isCreatingFeedback } = useFeedback();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      return;
    }

    try {
      await createFeedback({
        title: trimmedTitle,
        description: trimmedDescription,
      });
      setTitle("");
      setDescription("");
      toast.success(tToast("feedbackSubmitSuccess"));
    } catch {
      toast.error(tToast("feedbackSubmitFailed"));
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <h2 className="text-2xl font-bold">{t("title")}</h2>
      <p className="text-sm text-muted-foreground">{t("description")}</p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="feedback-title">{t("fieldTitle")}</Label>
          <Input
            id="feedback-title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("fieldTitlePlaceholder")}
            disabled={isCreatingFeedback}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="feedback-description">{t("fieldDescription")}</Label>
          <Textarea
            id="feedback-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("fieldDescriptionPlaceholder")}
            disabled={isCreatingFeedback}
          />
        </div>

        <Button type="submit" disabled={isCreatingFeedback || !title.trim()}>
          {isCreatingFeedback ? t("sending") : t("submit")}
        </Button>
      </form>
    </div>
  );
}
