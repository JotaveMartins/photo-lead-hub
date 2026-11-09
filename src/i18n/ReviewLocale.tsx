import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { enUS, ptBR } from "date-fns/locale";
import english from "./en-review.json";

export type ReviewLocale = "pt-BR" | "en";
export const isReviewArea = (path: string) => path === "/integracoes" || path === "/estudio" || path.startsWith("/estudio/");
export const reviewLocaleFor = (isAdmin: boolean, path: string): ReviewLocale => isAdmin && isReviewArea(path) ? "en" : "pt-BR";
export const reviewText = (locale: ReviewLocale, source: string, values: readonly unknown[] = []) => {
  const text = locale === "en" ? (english as Record<string, string>)[source] ?? source : source;
  return text.replace(/\{(\d+)\}/g, (match, index) => index in values ? String(values[Number(index)]) : match);
};
const createLocale = (locale: ReviewLocale) => ({ locale, dateLocale: locale === "en" ? enUS : ptBR, t: (source: string, values?: readonly unknown[]) => reviewText(locale, source, values) });
const Context = createContext(createLocale("pt-BR"));

/** Scoped, role-selected UI copy only. Never changes API payloads or stored data. */
export const ReviewLocaleProvider = ({ locale, children }: { locale: ReviewLocale; children: ReactNode }) => {
  const value = useMemo(() => createLocale(locale), [locale]);
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = locale;
    return () => { document.documentElement.lang = previous; };
  }, [locale]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
};
export const useReviewLocale = () => useContext(Context);
