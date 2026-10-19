import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translations, type Lang } from "../i18n/translations";

type Theme = "light" | "dark";
interface Ctx { lang: Lang; theme: Theme; t: typeof translations.ar; toggleLang: () => void; toggleTheme: () => void; }
const AppContext = createContext<Ctx | null>(null);

const read = <T extends string>(key: string, fallback: T): T => {
  try { return (localStorage.getItem(key) as T) || fallback; } catch { return fallback; }
};
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => read<Lang>("maak-lang", "ar"));
  const [theme, setTheme] = useState<Theme>(() =>
    read<Theme>("maak-theme", matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

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
