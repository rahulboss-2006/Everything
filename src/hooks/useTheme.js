import { useEffect, useState } from "react";

const STORAGE_KEY = "everything-theme";

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "system";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);

    const root = document.documentElement;

    const applyTheme = () => {
      const actualTheme =
        theme === "system" ? getSystemTheme() : theme;

      root.classList.remove("light", "dark");
      root.classList.add(actualTheme);
      root.dataset.theme = actualTheme;
    };

    applyTheme();

    if (theme === "system") {
      const media = window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

      media.addEventListener("change", applyTheme);

      return () => {
        media.removeEventListener("change", applyTheme);
      };
    }
  }, [theme]);

  return {
    theme,
    setTheme,
  };
}