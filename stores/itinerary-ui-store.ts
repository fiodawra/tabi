"use client";

import type { View } from "react-big-calendar";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type TimeGridStep = 15 | 30 | 60;

type ItineraryUiState = {
  calendarView: View;
  categoryFiltersByCalendarId: Record<string, string[]>;
  selectedCalendarId: string | null;
  selectedDate: string;
  setCategoryFilter: (calendarId: string, categoryIds: string[]) => void;
  setCalendarView: (view: View) => void;
  setUncategorizedFilter: (calendarId: string, isVisible: boolean) => void;
  setSelectedCalendarId: (calendarId: string | null) => void;
  setSelectedDate: (date: Date) => void;
  setTimeGridStep: (step: TimeGridStep) => void;
  uncategorizedFiltersByCalendarId: Record<string, boolean>;
  timeGridStep: TimeGridStep;
};

export const useItineraryUiStore = create<ItineraryUiState>()(
  persist(
    (set) => ({
      calendarView: "week",
      categoryFiltersByCalendarId: {},
      selectedCalendarId: null,
      selectedDate: new Date().toISOString(),
      timeGridStep: 30,
      uncategorizedFiltersByCalendarId: {},
      setCalendarView: (view) => set({ calendarView: view }),
      setCategoryFilter: (calendarId, categoryIds) =>
        set((state) => ({
          categoryFiltersByCalendarId: {
            ...state.categoryFiltersByCalendarId,
            [calendarId]: categoryIds,
          },
        })),
      setSelectedCalendarId: (calendarId) =>
        set({ selectedCalendarId: calendarId }),
      setSelectedDate: (date) => set({ selectedDate: date.toISOString() }),
      setTimeGridStep: (step) => set({ timeGridStep: step }),
      setUncategorizedFilter: (calendarId, isVisible) =>
        set((state) => ({
          uncategorizedFiltersByCalendarId: {
            ...state.uncategorizedFiltersByCalendarId,
            [calendarId]: isVisible,
          },
        })),
    }),
    {
      name: "itinerary-ui-store",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
