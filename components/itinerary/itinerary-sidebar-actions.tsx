"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ItinerarySidebarActions = {
  onCreateItem: () => void;
  onOpenCalendarDialog: () => void;
  onOpenShareDialog: () => void;
};

const defaultActions: ItinerarySidebarActions = {
  onCreateItem: () => undefined,
  onOpenCalendarDialog: () => undefined,
  onOpenShareDialog: () => undefined,
};

type ItinerarySidebarActionsContextValue = {
  actions: ItinerarySidebarActions;
  setActions: (actions: ItinerarySidebarActions) => void;
};

const ItinerarySidebarActionsContext =
  createContext<ItinerarySidebarActionsContextValue | null>(null);

export function ItinerarySidebarActionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [actions, setActions] =
    useState<ItinerarySidebarActions>(defaultActions);
  const value = useMemo(
    () => ({
      actions,
      setActions,
    }),
    [actions],
  );

  return (
    <ItinerarySidebarActionsContext.Provider value={value}>
      {children}
    </ItinerarySidebarActionsContext.Provider>
  );
}

export function useItinerarySidebarActions() {
  const context = useContext(ItinerarySidebarActionsContext);

  if (!context) {
    return defaultActions;
  }

  return context.actions;
}

export function useRegisterItinerarySidebarActions(
  actions: ItinerarySidebarActions,
) {
  const context = useContext(ItinerarySidebarActionsContext);
  const setActions = context?.setActions;

  useEffect(() => {
    if (!setActions) {
      return;
    }

    setActions(actions);

    return () => setActions(defaultActions);
  }, [actions, setActions]);
}
