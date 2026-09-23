import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const THEME_STYLES = [
  ["aurora", "Aurora"],
  ["frost", "Frost"],
  ["lagoon", "Lagoon"],
  ["orchid", "Orchid"],
  ["midnight", "Midnight"],
  ["carbon", "Carbon"],
] as const;

export type ThemeStyle = (typeof THEME_STYLES)[number][0];

// midnight and carbon are the reference's own dark themes; the other four are light.
// "mode" mirrors that split as an explicit user-facing toggle.
const DARK_STYLES: ThemeStyle[] = ["midnight", "carbon"];

const STORAGE_KEY = "ivconnect.theme";

interface StoredTheme {
  style: ThemeStyle;
  mode: "light" | "dark";
}

function loadStored(): StoredTheme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (THEME_STYLES.some(([k]) => k === parsed.style)) return parsed;
    }
  } catch {
    // ignore malformed/unavailable storage
  }
  return { style: "aurora", mode: "light" };
}

interface ThemeContextValue {
  style: ThemeStyle;
  mode: "light" | "dark";
  setStyle: (style: ThemeStyle) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [{ style, mode }, setTheme] = useState<StoredTheme>(loadStored);

  useEffect(() => {
    document.documentElement.setAttribute("data-style", style);
    document.documentElement.setAttribute("data-mode", mode);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ style, mode }));
    } catch {
      // per-device preference only; ignore storage failures
    }
  }, [style, mode]);

  const setStyle = (next: ThemeStyle) => setTheme({ style: next, mode: DARK_STYLES.includes(next) ? "dark" : "light" });

  // Switches to the nearest style of the opposite mode, mirroring the reference's own
  // light/dark split (aurora/frost/lagoon/orchid vs. midnight/carbon).
  const toggleMode = () =>
    setTheme((prev) => {
      const nextMode = prev.mode === "light" ? "dark" : "light";
      const fallback = nextMode === "dark" ? "midnight" : "aurora";
      return { style: fallback, mode: nextMode };
    });

  const value = useMemo(() => ({ style, mode, setStyle, toggleMode }), [style, mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
