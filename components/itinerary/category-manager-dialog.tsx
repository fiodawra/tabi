"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useToastOperation } from "@/hooks/use-toast-operation";
import type {
  ItineraryCategory,
  SaveItineraryCategoryInput,
} from "@/services/itinerary-category-service";
import {
  DEFAULT_CATEGORY_COLOR,
  PREDEFINED_CATEGORY_COLORS,
} from "@/services/itinerary-category-service";
import { getCategoryErrorMessage } from "./itinerary-utils";

type CategoryManagerDialogProps = {
  canEdit: boolean;
  categories: ItineraryCategory[];
  createCategory: (input: SaveItineraryCategoryInput) => Promise<unknown>;
  deleteCategory: (categoryId: string) => Promise<unknown>;
  isDeletingCategory: boolean;
  isSavingCategory: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  t: (key: string) => string;
  updateCategory: (
    input: SaveItineraryCategoryInput & { categoryId: string },
  ) => Promise<unknown>;
};

function CategoryColorOption({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className="size-3 shrink-0 rounded-full ring-1 ring-foreground/10"
        style={{ backgroundColor: color }}
      />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function CategoryManagerDialog({
  canEdit,
  categories,
  createCategory,
  deleteCategory,
  isDeletingCategory,
  isSavingCategory,
  onOpenChange,
  open,
  t,
  updateCategory,
}: CategoryManagerDialogProps) {
  const runToastOperation = useToastOperation();
  const [categoryError, setCategoryError] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState(DEFAULT_CATEGORY_COLOR);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );

  function resetForm() {
    setCategoryColor(DEFAULT_CATEGORY_COLOR);
    setCategoryError("");
    setCategoryName("");
    setEditingCategoryId(null);
  }

  async function handleCategorySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCategoryError("");

    const isEditing = Boolean(editingCategoryId);

    await runToastOperation(
      async () => {
        if (isEditing && editingCategoryId) {
          await updateCategory({
            categoryId: editingCategoryId,
            color: categoryColor,
            name: categoryName,
          });
          return;
        }

        await createCategory({
          color: categoryColor,
          name: categoryName,
        });
      },
      {
        error: isEditing ? "categoryUpdateFailed" : "categoryCreateFailed",
        success: isEditing ? "categoryUpdateSuccess" : "categoryCreateSuccess",
        onError: (error) => setCategoryError(getCategoryErrorMessage(error, t)),
        onSuccess: resetForm,
      },
    ).catch(() => undefined);
  }

  function handleStartCategoryEdit(category: ItineraryCategory) {
    setCategoryColor(category.color);
    setCategoryName(category.name);
    setCategoryError("");
    setEditingCategoryId(category.id);
  }

  function handleDeleteCategory(categoryId: string) {
    void runToastOperation(() => deleteCategory(categoryId), {
      error: "categoryDeleteFailed",
      success: "categoryDeleteSuccess",
      onSuccess: () => {
        if (editingCategoryId === categoryId) {
          resetForm();
        }
      },
    }).catch(() => undefined);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("categoryManager.title")}</DialogTitle>
          <DialogDescription>
            {t("categoryManager.description")}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleCategorySubmit}>
          <FieldGroup>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.6fr)]">
              <Field>
                <FieldLabel htmlFor="category-name">
                  {t("categoryManager.name")}
                </FieldLabel>
                <Input
                  disabled={!canEdit || isSavingCategory}
                  id="category-name"
                  onChange={(event) => {
                    setCategoryName(event.target.value);
                    setCategoryError("");
                  }}
                  placeholder={t("categoryManager.namePlaceholder")}
                  value={categoryName}
                />
              </Field>
              <Field>
                <FieldLabel>{t("categoryManager.color")}</FieldLabel>
                <Select
                  disabled={!canEdit || isSavingCategory}
                  onValueChange={setCategoryColor}
                  value={categoryColor}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {PREDEFINED_CATEGORY_COLORS.map((color) => (
                        <SelectItem key={color.id} value={color.value}>
                          <CategoryColorOption
                            color={color.value}
                            label={t(`categoryManager.colors.${color.id}`)}
                          />
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <FieldError>{categoryError}</FieldError>
          </FieldGroup>
          <DialogFooter>
            {editingCategoryId ? (
              <Button onClick={resetForm} type="button" variant="ghost">
                {t("categoryManager.cancelEdit")}
              </Button>
            ) : null}
            <Button disabled={!canEdit || isSavingCategory} type="submit">
              {isSavingCategory ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <PlusIcon data-icon="inline-start" />
              )}
              {editingCategoryId
                ? t("categoryManager.save")
                : t("categoryManager.create")}
            </Button>
          </DialogFooter>
        </form>

        <div className="flex flex-col gap-2">
          <h3 className="font-medium text-sm">
            {t("categoryManager.yourCategories")}
          </h3>
          {categories.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-muted-foreground text-sm">
              {t("categoryManager.empty")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {categories.map((category) => (
                <div
                  className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  key={category.id}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <p className="truncate font-medium text-sm">
                      {category.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      disabled={!canEdit || isSavingCategory}
                      onClick={() => handleStartCategoryEdit(category)}
                      type="button"
                      variant="outline"
                    >
                      <PencilIcon data-icon="inline-start" />
                      {t("categoryManager.edit")}
                    </Button>
                    <Button
                      disabled={
                        !canEdit || isDeletingCategory || isSavingCategory
                      }
                      onClick={() => handleDeleteCategory(category.id)}
                      type="button"
                      variant="destructive"
                    >
                      {isDeletingCategory ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <Trash2Icon data-icon="inline-start" />
                      )}
                      {t("categoryManager.delete")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
