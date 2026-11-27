"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { translate, type Dictionary } from "./load-dictionary";
import type { Locale } from "./locale-config";

interface LocaleContextValue {
  locale: Locale;
  /** Text from the client namespaces (`common`, `shell`); unknown keys render as the key. */
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  const value = useMemo<LocaleContextValue>(
    () => ({ locale, t: (key) => translate(dictionary, key) }),
    [locale, dictionary],
  );
  return <LocaleContext value={value}>{children}</LocaleContext>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside <LocaleProvider>");
  return value;
}
