import { useEffect, useState } from "react";

const STORAGE_KEY = "everything-theme";

function getSystemTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getSavedTheme() {
  if (typeof window === "undefined") {
    return "system";
  }

  return localStorage.getItem(STORAGE_KEY) || "system";
}

export default function useTheme() {
  const [theme, setTheme] = useState(getSavedTheme);

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    const saved = getSavedTheme();

    return saved === "system"
      ? getSystemTheme()
      : saved;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);

    const root = document.documentElement;

    const updateTheme = () => {
      const actualTheme =
        theme === "system"
          ? getSystemTheme()
          : theme;

      root.classList.remove("light", "dark");
      root.classList.add(actualTheme);
      root.dataset.theme = actualTheme;

      setResolvedTheme(actualTheme);
    };

    updateTheme();

    if (theme === "system") {
      const media = window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

      media.addEventListener("change", updateTheme);

      return () => {
        media.removeEventListener("change", updateTheme);
      };
    }
  }, [theme]);

  return {
    theme,
    setTheme,
    resolvedTheme,
  };
}