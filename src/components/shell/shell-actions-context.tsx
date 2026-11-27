"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Mount point between the full shell and the features that plug into it
 * (F001 RISK-02): the FAB items call openers that F008 (rules panel, phase 8)
 * and F005 (write-kudo modal, phase 6) register here, and F005 raises
 * `localeLocked` while its form is open so the language switch is disabled (D005).
 * Until a feature registers, its FAB item only closes the FAB.
 */
export type ShellAction = "rules" | "compose";

interface ShellActionsValue {
  /** Registers the opener for an action; returns the unregister function. */
  registerAction: (action: ShellAction, opener: () => void) => () => void;
  runAction: (action: ShellAction) => void;
  localeLocked: boolean;
  setLocaleLocked: (locked: boolean) => void;
}

const ShellActionsContext = createContext<ShellActionsValue | null>(null);

export function ShellActionsProvider({ children }: { children: ReactNode }) {
  const openers = useRef(new Map<ShellAction, () => void>());
  const [localeLocked, setLocaleLocked] = useState(false);

  const registerAction = useCallback((action: ShellAction, opener: () => void) => {
    openers.current.set(action, opener);
    return () => {
      if (openers.current.get(action) === opener) openers.current.delete(action);
    };
  }, []);
  const runAction = useCallback((action: ShellAction) => openers.current.get(action)?.(), []);

  const value = useMemo(
    () => ({ registerAction, runAction, localeLocked, setLocaleLocked }),
    [registerAction, runAction, localeLocked],
  );
  return <ShellActionsContext value={value}>{children}</ShellActionsContext>;
}

/** Null outside the full shell (Login, error pages), where nothing is registered. */
export function useShellActions(): ShellActionsValue | null {
  return useContext(ShellActionsContext);
}
