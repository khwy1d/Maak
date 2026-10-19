import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translations, type Lang } from "../i18n/translations";

type Theme = "light" | "dark";
interface Ctx { lang: Lang; theme: Theme; t: typeof translations.ar; toggleLang: () => void; toggleTheme: () => void; }
const AppContext = createContext<Ctx | null>(null);

const readLang = (): Lang => {
  try {
    const value = localStorage.getItem("maak-lang");
    return value === "ar" || value === "en" ? value : "ar";
  } catch { return "ar"; }
};
const readTheme = (): Theme => {
  try {
    const value = localStorage.getItem("maak-theme");
    if (value === "light" || value === "dark") return value;
  } catch { /* storage may be unavailable */ }
  try { return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }
  catch { return "light"; }
};
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readLang);
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    const d = document.documentElement;
    d.lang = lang; d.dir = lang === "ar" ? "rtl" : "ltr";
    document.title = translations[lang].meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", translations[lang].meta.description);
    write("maak-lang", lang);
  }, [lang]);

  useEffect(() => { document.documentElement.dataset.theme = theme; write("maak-theme", theme); }, [theme]);

  const value = useMemo<Ctx>(() => ({
    lang, theme, t: translations[lang],
    toggleLang: () => setLang((l) => (l === "ar" ? "en" : "ar")),
    toggleTheme: () => setTheme((x) => (x === "dark" ? "light" : "dark")),
  }), [lang, theme]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export const useApp = () => {
  const c = useContext(AppContext);
  if (!c) throw new Error("useApp must be used inside AppProvider");
  return c;
};
