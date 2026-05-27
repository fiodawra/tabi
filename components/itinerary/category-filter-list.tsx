"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { FieldGroup } from "@/components/ui/field";
import type { ItineraryCategory } from "@/services/itinerary-category-service";

type CategoryFilterListProps = {
  categories: ItineraryCategory[];
  isUncategorizedVisible: boolean;
  onCategoryChange: (categoryId: string, isVisible: boolean) => void;
  onUncategorizedChange: (isVisible: boolean) => void;
  t: (key: string) => string;
  visibleCategoryIdSet: Set<string>;
};

export function CategoryFilterList({
  categories,
  isUncategorizedVisible,
  onCategoryChange,
  onUncategorizedChange,
  t,
  visibleCategoryIdSet,
}: CategoryFilterListProps) {
  return (
    <FieldGroup className="flex flex-col gap-1" data-slot="checkbox-group">
      {categories.map((category) => {
        const isChecked = visibleCategoryIdSet.has(category.id);

        return (
          <label
            className="flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-primary/10"
            htmlFor={`category-filter-${category.id}`}
            key={category.id}
          >
            <Checkbox
              checked={isChecked}
              id={`category-filter-${category.id}`}
              onCheckedChange={(checked) =>
                onCategoryChange(category.id, checked === true)
              }
            />
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span className="truncate font-medium text-foreground/80 text-xs">
                {category.name}
              </span>
            </span>
          </label>
        );
      })}

      <label
        className="flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-primary/10"
        htmlFor="category-filter-uncategorized"
      >
        <Checkbox
          checked={isUncategorizedVisible}
          id="category-filter-uncategorized"
          onCheckedChange={(checked) => onUncategorizedChange(checked === true)}
        />
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full bg-muted-foreground"
          />
          <span className="truncate font-medium text-foreground/80 text-xs">
            {t("category.uncategorized")}
          </span>
        </span>
      </label>
    </FieldGroup>
  );
}
