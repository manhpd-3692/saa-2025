"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Mount point between the full shell and the features that plug into it
 * (F001 RISK-02): the FAB items call openers that F008 (rules panel, phase 8)
 * and F005 (write-kudo modal, KudoComposeHost) register here, and F005 raises
 * `localeLocked` while its form is open so the language switch is disabled (D005).
 * Until a feature registers, its FAB item only closes the FAB.
 */
export type ShellAction = "rules" | "compose";

/** `compose` with a `kudoId` opens the write-kudo form on the author's own kudo (F005 FR-102). */
export interface ShellActionPayload {
  kudoId?: string;
}

type ShellActionOpener = (payload?: ShellActionPayload) => void;

interface ShellActionsValue {
  /** Registers the opener for an action; returns the unregister function. */
  registerAction: (action: ShellAction, opener: ShellActionOpener) => () => void;
  runAction: (action: ShellAction, payload?: ShellActionPayload) => void;
  /** True while the write-kudo form is open (F005 registers it); the language switch is disabled (D005). */
  localeLocked: boolean;
  setLocaleLocked: (locked: boolean) => void;
}

const ShellActionsContext = createContext<ShellActionsValue | null>(null);

export function ShellActionsProvider({ children }: { children: ReactNode }) {
  const openers = useRef(new Map<ShellAction, ShellActionOpener>());
  const [localeLocked, setLocaleLocked] = useState(false);

  const registerAction = useCallback((action: ShellAction, opener: ShellActionOpener) => {
    openers.current.set(action, opener);
    return () => {
      if (openers.current.get(action) === opener) openers.current.delete(action);
    };
  }, []);
  const runAction = useCallback(
    (action: ShellAction, payload?: ShellActionPayload) => openers.current.get(action)?.(payload),
    [],
  );

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
