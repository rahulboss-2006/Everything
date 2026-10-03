import {
  LogIn,
  LogOut,
  Menu,
  Sparkles,
  User,
  X,
} from "lucide-react";

import { Link, useLocation } from "react-router-dom";

import {
  useEffect,
  useState,
} from "react";

import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";

import logoLight from "../assets/logo-light.png";
import logoDark from "../assets/logo-dark.png";


function getCurrentTheme() {
  const root = document.documentElement;

  const theme =
    root.dataset.theme ||
    document.body?.dataset.theme;

  if (theme === "dark") {
    return "dark";
  }

  if (theme === "light") {
    return "light";
  }

  if (
    root.classList.contains("dark") ||
    document.body?.classList.contains("dark")
  ) {
    return "dark";
  }

  if (
    root.classList.contains("light") ||
    document.body?.classList.contains("light")
  ) {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}


function Navbar() {
  const {
    user,
    loading,
    logout,
  } = useAuth();

  const location = useLocation();

  const [currentTheme, setCurrentTheme] = useState(
    getCurrentTheme()
  );

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  /* =========================================
     WATCH THEME CHANGES
  ========================================= */

  useEffect(() => {
    const root = document.documentElement;

    const updateTheme = () => {
      setCurrentTheme(getCurrentTheme());
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);

    observer.observe(root, {
      attributes: true,
      attributeFilter: [
        "class",
        "data-theme",
      ],
    });

    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: [
          "class",
          "data-theme",
        ],
      });
    }

    const systemTheme = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    systemTheme.addEventListener(
      "change",
      updateTheme
    );

    return () => {
      observer.disconnect();

      systemTheme.removeEventListener(
        "change",
        updateTheme
      );
    };
  }, []);


  /* =========================================
     CLOSE MOBILE MENU ON ROUTE CHANGE
  ========================================= */

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);


  /* =========================================
     CLOSE MENU ON DESKTOP
  ========================================= */

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, []);


  /* =========================================
     PREVENT BODY SCROLL WHEN MENU OPEN
  ========================================= */

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);


  /* =========================================
     LOGOUT
  ========================================= */

  async function handleLogout() {
    setMobileMenuOpen(false);
    await logout();
  }


  /* =========================================
     MOBILE MENU TOGGLE
  ========================================= */

  function toggleMobileMenu() {
    setMobileMenuOpen((prev) => !prev);
  }


  /* =========================================
     CURRENT LOGO
  ========================================= */

  const currentLogo =
    currentTheme === "dark"
      ? logoDark
      : logoLight;


  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/80">

      {/* =========================================
          DESKTOP / MAIN HEADER
      ========================================= */}

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* =========================================
            LOGO
        ========================================= */}

        <Link
          to="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex shrink-0 items-center gap-2 text-xl font-bold"
        >
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-slate-100 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-700/60 sm:h-12 sm:w-12">

            <img
              key={currentTheme}
              src={currentLogo}
              alt="Everything"
              className="h-full w-full object-contain p-1.5"
            />

          </div>

          <span className="hidden xs:inline sm:inline">
            Everything
          </span>
        </Link>


        {/* =========================================
            DESKTOP NAVIGATION
        ========================================= */}

        <nav className="hidden items-center gap-6 md:flex lg:gap-8">

          <Link
            to="/"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            Home
          </Link>

          <Link
            to="/about"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            About
          </Link>

          <Link
            to="/features"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            Features
          </Link>

          <Link
            to="/contact"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            Contact
          </Link>

        </nav>


        {/* =========================================
            RIGHT SIDE
        ========================================= */}

        <div className="flex items-center gap-2 sm:gap-3">

          <ThemeToggle />


          {/* =========================================
              DESKTOP LOGIN
          ========================================= */}

          {!loading && !user && (
            <Link
              to="/login"
              className="hidden items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 md:flex dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LogIn size={16} />

              Login
            </Link>
          )}


          {/* =========================================
              DESKTOP LOGGED-IN USER
          ========================================= */}

          {!loading && user && (
            <div className="hidden items-center gap-2 md:flex">

              {/* CREDITS */}

              <Link
                to="/recharge"
                className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm transition hover:bg-slate-100 lg:flex dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <Sparkles
                  size={15}
                  className="text-slate-500 dark:text-slate-400"
                />

                <span className="font-semibold text-slate-900 dark:text-white">
                  {user.credits}
                </span>

                <span className="text-slate-500 dark:text-slate-400">
                  credits
                </span>
              </Link>


              {/* USER */}

              <div className="hidden items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 lg:flex dark:bg-slate-800">

                <User size={16} />

                <span className="max-w-[160px] truncate text-sm font-medium">
                  {user.email}
                </span>

              </div>


              {/* LOGOUT */}

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <LogOut size={16} />

                <span className="hidden lg:inline">
                  Logout
                </span>
              </button>

            </div>
          )}


          {/* =========================================
              MOBILE HAMBURGER
          ========================================= */}

          <button
            type="button"
            onClick={toggleMobileMenu}
            aria-label={
              mobileMenuOpen
                ? "Close menu"
                : "Open menu"
            }
            aria-expanded={mobileMenuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-100 md:hidden dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {mobileMenuOpen ? (
              <X size={21} />
            ) : (
              <Menu size={21} />
            )}
          </button>

        </div>

      </div>


      {/* =========================================
          MOBILE MENU
      ========================================= */}

      <div
        className={`overflow-hidden border-t border-slate-200/70 bg-white/95 backdrop-blur-xl transition-all duration-300 md:hidden dark:border-slate-800/70 dark:bg-slate-950/95 ${
          mobileMenuOpen
            ? "max-h-[calc(100vh-4rem)] opacity-100"
            : "max-h-0 opacity-0"
        }`}
      >

        <div className="mx-auto max-w-7xl overflow-y-auto px-4 py-4 sm:px-6">

          {/* =========================================
              MOBILE NAVIGATION
          ========================================= */}

          <nav className="flex flex-col gap-1">

            <Link
              to="/"
              className="rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Home
            </Link>

            <Link
              to="/about"
              className="rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              About
            </Link>

            <Link
              to="/features"
              className="rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Features
            </Link>

            <Link
              to="/contact"
              className="rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Contact
            </Link>

          </nav>


          {/* =========================================
              MOBILE AUTH SECTION
          ========================================= */}

          {!loading && !user && (
            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">

              <Link
                to="/login"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <LogIn size={17} />

                Login
              </Link>

            </div>
          )}


          {/* =========================================
              MOBILE USER SECTION
          ========================================= */}

          {!loading && user && (
            <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">

              {/* USER INFO */}

              <div className="flex items-center gap-3 rounded-xl bg-slate-100 p-3 dark:bg-slate-800">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-700">
                  <User size={17} />
                </div>

                <div className="min-w-0">

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Signed in as
                  </p>

                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {user.email}
                  </p>

                </div>

              </div>


              {/* CREDITS */}

              <Link
                to="/recharge"
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              >

                <div className="flex items-center gap-2">

                  <Sparkles
                    size={17}
                    className="text-slate-500 dark:text-slate-400"
                  />

                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Credits
                  </span>

                </div>

                <span className="font-semibold text-slate-900 dark:text-white">
                  {user.credits}
                </span>

              </Link>


              {/* LOGOUT */}

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >

                <LogOut size={17} />

                Logout

              </button>

            </div>
          )}

        </div>

      </div>

    </header>
  );
}

export default Navbar;
