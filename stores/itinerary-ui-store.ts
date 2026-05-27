"use client";

import type { View } from "react-big-calendar";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type TimeGridStep = 15 | 30 | 60;

type ItineraryUiState = {
  calendarView: View;
  selectedDate: string;
  setCalendarView: (view: View) => void;
  setSelectedDate: (date: Date) => void;
  setTimeGridStep: (step: TimeGridStep) => void;
  timeGridStep: TimeGridStep;
};

export const useItineraryUiStore = create<ItineraryUiState>()(
  persist(
    (set) => ({
      calendarView: "week",
      selectedDate: new Date().toISOString(),
      timeGridStep: 30,
      setCalendarView: (view) => set({ calendarView: view }),
      setSelectedDate: (date) => set({ selectedDate: date.toISOString() }),
      setTimeGridStep: (step) => set({ timeGridStep: step }),
    }),
    {
      name: "itinerary-ui-store",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
