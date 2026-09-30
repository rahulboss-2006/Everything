import {
  Moon,
  Sun,
  Monitor,
} from "lucide-react";

import useTheme from "../hooks/useTheme";


/* =========================================
   THEME TOGGLE
========================================= */

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="hidden items-center gap-1 rounded-xl border border-slate-200 p-1 sm:flex dark:border-slate-800">

      {/* SYSTEM */}

      <ThemeButton
        active={theme === "system"}
        onClick={() => setTheme("system")}
        icon={<Monitor size={15} />}
        title="System"
      />


      {/* LIGHT */}

      <ThemeButton
        active={theme === "light"}
        onClick={() => setTheme("light")}
        icon={<Sun size={15} />}
        title="Light"
      />


      {/* DARK */}

      <ThemeButton
        active={theme === "dark"}
        onClick={() => setTheme("dark")}
        icon={<Moon size={15} />}
        title="Dark"
      />

    </div>
  );
}


/* =========================================
   THEME BUTTON
========================================= */

function ThemeButton({
  active,
  onClick,
  icon,
  title,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={`${title} theme`}
      aria-pressed={active}
      className={`rounded-lg p-2 transition ${
        active
          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      {icon}
    </button>
  );
}