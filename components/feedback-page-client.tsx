"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFeedback } from "@/hooks/use-feedback";
import { useTranslations } from "@/hooks/use-i18n";
import { useToastOperation } from "@/hooks/use-toast-operation";

export function FeedbackPageClient() {
  const t = useTranslations("FeedbackPage");
  const { createFeedback, isCreatingFeedback } = useFeedback();
  const runToastOperation = useToastOperation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      return;
    }

    await runToastOperation(
      () =>
        createFeedback({
          title: trimmedTitle,
          description: trimmedDescription,
        }),
      {
        error: "feedbackSubmitFailed",
        success: "feedbackSubmitSuccess",
        onSuccess: () => {
          setTitle("");
          setDescription("");
        },
      },
    ).catch(() => undefined);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-bold text-2xl">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="feedback-title">{t("fieldTitle")}</FieldLabel>
            <Input
              disabled={isCreatingFeedback}
              id="feedback-title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("fieldTitlePlaceholder")}
              required
              value={title}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="feedback-description">
              {t("fieldDescription")}
            </FieldLabel>
            <Textarea
              disabled={isCreatingFeedback}
              id="feedback-description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("fieldDescriptionPlaceholder")}
              value={description}
            />
          </Field>
        </FieldGroup>

        <Button disabled={isCreatingFeedback || !title.trim()} type="submit">
          {isCreatingFeedback ? t("sending") : t("submit")}
        </Button>
      </form>
    </div>
  );
}
