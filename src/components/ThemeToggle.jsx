import {
  Moon,
  Sun,
  Monitor,
} from "lucide-react";

import useTheme from "../hooks/useTheme";


export default function ThemeToggle() {
  const {
    theme,
    setTheme,
  } = useTheme();


  return (
    <div
      className="
        flex
        shrink-0
        items-center
        gap-1

        rounded-xl

        border
        border-slate-200

        bg-white

        p-1

        dark:border-slate-800
        dark:bg-slate-900
      "
    >

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


/* =========================================================
   THEME BUTTON
========================================================= */

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

      className={`
        flex
        h-8
        w-8
        shrink-0

        items-center
        justify-center

        rounded-lg

        transition-all
        duration-200

        active:scale-95

        ${
          active
            ? `
              bg-slate-900
              text-white
              shadow-sm

              dark:bg-white
              dark:text-slate-950
            `
            : `
              text-slate-500

              hover:bg-slate-100
              hover:text-slate-900

              dark:text-slate-400
              dark:hover:bg-slate-800
              dark:hover:text-white
            `
        }
      `}
    >
      {icon}
    </button>
  );
}

