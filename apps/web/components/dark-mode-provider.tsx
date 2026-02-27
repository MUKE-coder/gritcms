"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ColorModeContext {
  theme: Theme;
  toggleTheme: () => void;
}

const ColorModeCtx = createContext<ColorModeContext>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useColorMode() {
  return useContext(ColorModeCtx);
}

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("grit-theme") as Theme | null;
    const initial = stored || "dark";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("grit-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  // Prevent flash: render children immediately but don't expose toggle until mounted
  return (
    <ColorModeCtx.Provider value={{ theme: mounted ? theme : "dark", toggleTheme }}>
      {children}
    </ColorModeCtx.Provider>
  );
}
