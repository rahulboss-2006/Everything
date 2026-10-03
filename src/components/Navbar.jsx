import {
  LogIn,
  LogOut,
  Menu,
  Sparkles,
  User,
  X,
  Home,
  Info,
  Layers3,
  Mail,
  ChevronRight,
} from "lucide-react";

import {
  Link,
  useLocation,
} from "react-router-dom";

import {
  useEffect,
  useState,
} from "react";

import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";

import logoLight from "../assets/logo-light.png";
import logoDark from "../assets/logo-dark.png";


/* =========================================================
   THEME
========================================================= */

function getCurrentTheme() {
  const root = document.documentElement;

  const theme =
    root.dataset.theme ||
    document.body?.dataset.theme;

  if (theme === "dark") return "dark";
  if (theme === "light") return "light";

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

  return window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches
    ? "dark"
    : "light";
}


/* =========================================================
   NAVIGATION
========================================================= */

const navigation = [
  {
    name: "Home",
    path: "/",
    icon: Home,
  },
  {
    name: "About",
    path: "/about",
    icon: Info,
  },
  {
    name: "Features",
    path: "/features",
    icon: Layers3,
  },
  {
    name: "Contact",
    path: "/contact",
    icon: Mail,
  },
];


function Navbar() {
  const {
    user,
    loading,
    logout,
  } = useAuth();

  const location = useLocation();

  const [currentTheme, setCurrentTheme] =
    useState(getCurrentTheme);

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);


  /* =========================================================
     THEME WATCH
  ========================================================= */

  useEffect(() => {
    const root = document.documentElement;

    const updateTheme = () => {
      setCurrentTheme(getCurrentTheme());
    };

    updateTheme();

    const observer =
      new MutationObserver(updateTheme);

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

    const mediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    mediaQuery.addEventListener(
      "change",
      updateTheme
    );

    return () => {
      observer.disconnect();

      mediaQuery.removeEventListener(
        "change",
        updateTheme
      );
    };
  }, []);


  /* =========================================================
     ROUTE CHANGE
  ========================================================= */

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);


  /* =========================================================
     ESC KEY
  ========================================================= */

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);


  /* =========================================================
     BODY SCROLL
  ========================================================= */

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


  /* =========================================================
     LOGOUT
  ========================================================= */

  async function handleLogout() {
    setMobileMenuOpen(false);
    await logout();
  }


  /* =========================================================
     LOGO
  ========================================================= */

  const currentLogo =
    currentTheme === "dark"
      ? logoDark
      : logoLight;


  /* =========================================================
     ACTIVE ROUTE
  ========================================================= */

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname.startsWith(path);
  };


  return (
    <header
      className="
        sticky
        top-0
        z-50
        px-2.5
        pt-2.5
        sm:px-4
        sm:pt-3
        lg:px-6
      "
    >

      <div
        className="
          mx-auto
          w-full
          max-w-7xl
        "
      >

        {/* =================================================
            MAIN NAVBAR
        ================================================= */}

        <div
          className="
            relative
            z-50
            grid

            grid-cols-[auto_1fr_auto]

            items-center
            gap-2

            rounded-2xl
            border
            border-slate-200/80
            bg-white/95
            px-2.5
            py-2

            shadow-[0_8px_30px_rgba(15,23,42,0.06)]

            backdrop-blur-xl

            dark:border-slate-800
            dark:bg-slate-950/95
            dark:shadow-[0_8px_30px_rgba(0,0,0,0.28)]

            sm:min-h-[66px]
            sm:px-3

            lg:gap-4
            lg:px-4
          "
        >

          {/* =================================================
              LOGO
          ================================================= */}

          <Link
            to="/"
            className="
              group
              flex
              min-w-0
              items-center
              gap-2
              sm:gap-2.5
            "
          >

            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                overflow-hidden
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                shadow-sm
                transition
                duration-300
                group-hover:scale-105

                dark:border-slate-700
                dark:bg-slate-900

                sm:h-11
                sm:w-11
              "
            >

              <img
                key={currentTheme}
                src={currentLogo}
                alt="Everything"
                className="
                  h-full
                  w-full
                  object-contain
                  p-1.5
                "
              />

            </div>


            {/* Brand text */}

            <div
              className="
                hidden
                min-w-0
                sm:block
              "
            >

              <p
                className="
                  truncate
                  text-[16px]
                  font-bold
                  leading-tight
                  tracking-tight
                  text-slate-950

                  dark:text-white

                  lg:text-[17px]
                "
              >
                Everything
              </p>

              <p
                className="
                  hidden
                  truncate
                  text-[9px]
                  font-medium
                  uppercase
                  tracking-[0.16em]
                  text-slate-400

                  lg:block
                "
              >
                Everything you need
              </p>

            </div>

          </Link>


          {/* =================================================
              DESKTOP NAVIGATION

              IMPORTANT:
              Normal grid item.
              NO absolute positioning.
          ================================================= */}

          <nav
            className="
              hidden
              min-w-0
              items-center
              justify-center
              gap-0.5

              md:flex
              lg:gap-1
            "
          >

            {navigation.map((item) => {
              const active =
                isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    whitespace-nowrap
                    rounded-lg
                    px-2.5
                    py-2
                    text-[13px]
                    font-medium
                    transition-all
                    duration-200

                    lg:rounded-xl
                    lg:px-3
                    lg:py-2.5
                    lg:text-sm

                    ${
                      active
                        ? `
                          bg-slate-100
                          text-slate-950
                          shadow-sm

                          dark:bg-slate-800
                          dark:text-white
                        `
                        : `
                          text-slate-500
                          hover:bg-slate-50
                          hover:text-slate-950

                          dark:text-slate-400
                          dark:hover:bg-slate-900
                          dark:hover:text-white
                        `
                    }
                  `}
                >
                  {item.name}
                </Link>
              );
            })}

          </nav>


          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <div
            className="
              flex
              min-w-0
              shrink-0
              items-center
              justify-end
              gap-1.5

              sm:gap-2
            "
          >

            {/* Theme */}

            <div className="shrink-0">
              <ThemeToggle />
            </div>


            {/* =================================================
                DESKTOP LOGGED OUT
            ================================================= */}

            {!loading && !user && (
              <Link
                to="/login"
                className="
                  hidden
                  shrink-0
                  items-center
                  gap-1.5
                  rounded-xl
                  bg-slate-950
                  px-3
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  shadow-sm
                  transition
                  hover:-translate-y-0.5
                  hover:shadow-md

                  dark:bg-white
                  dark:text-slate-950

                  md:flex
                  lg:gap-2
                  lg:px-4
                "
              >

                <LogIn size={16} />

                <span>
                  Login
                </span>

              </Link>
            )}


            {/* =================================================
                DESKTOP LOGGED IN
            ================================================= */}

            {!loading && user && (
              <div
                className="
                  hidden
                  min-w-0
                  items-center
                  gap-1.5

                  md:flex
                  lg:gap-2
                "
              >

                {/* Credits */}

                <Link
                  to="/recharge"
                  className="
                    flex
                    shrink-0
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-2
                    py-2
                    transition
                    hover:border-slate-300
                    hover:shadow-sm

                    dark:border-slate-700
                    dark:bg-slate-900
                    dark:hover:border-slate-600

                    lg:px-3
                  "
                >

                  <div
                    className="
                      flex
                      h-7
                      w-7
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      bg-slate-100

                      dark:bg-slate-800
                    "
                  >
                    <Sparkles
                      size={14}
                      className="
                        text-slate-600
                        dark:text-slate-300
                      "
                    />
                  </div>

                  <div className="hidden lg:block">

                    <p
                      className="
                        text-[9px]
                        font-semibold
                        uppercase
                        tracking-wider
                        text-slate-400
                      "
                    >
                      Balance
                    </p>

                    <p
                      className="
                        text-sm
                        font-bold
                        leading-tight
                        text-slate-900

                        dark:text-white
                      "
                    >
                      {user.credits}

                      <span
                        className="
                          ml-1
                          text-[10px]
                          font-medium
                          text-slate-400
                        "
                      >
                        credits
                      </span>
                    </p>

                  </div>

                </Link>


                {/* User */}

                <div
                  className="
                    hidden
                    min-w-0
                    max-w-[150px]
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    px-2.5
                    py-2

                    xl:flex

                    dark:border-slate-800
                    dark:bg-slate-900
                  "
                >

                  <div
                    className="
                      flex
                      h-7
                      w-7
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      bg-white
                      shadow-sm

                      dark:bg-slate-800
                    "
                  >
                    <User size={14} />
                  </div>

                  <span
                    className="
                      min-w-0
                      truncate
                      text-xs
                      font-semibold
                      text-slate-700

                      dark:text-slate-200
                    "
                  >
                    {user.email}
                  </span>

                </div>


                {/* Logout */}

                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Logout"
                  title="Logout"
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-slate-200
                    text-slate-500
                    transition

                    hover:border-red-200
                    hover:bg-red-50
                    hover:text-red-600

                    dark:border-slate-700
                    dark:text-slate-400
                    dark:hover:border-red-900
                    dark:hover:bg-red-950/30
                    dark:hover:text-red-400
                  "
                >
                  <LogOut size={16} />
                </button>

              </div>
            )}


            {/* =================================================
                MOBILE MENU BUTTON
            ================================================= */}

            <button
              type="button"
              onClick={() =>
                setMobileMenuOpen(
                  (prev) => !prev
                )
              }
              aria-label={
                mobileMenuOpen
                  ? "Close menu"
                  : "Open menu"
              }
              aria-expanded={mobileMenuOpen}
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                text-slate-700
                shadow-sm
                transition-all
                duration-200
                active:scale-95

                dark:border-slate-700
                dark:bg-slate-900
                dark:text-slate-200

                md:hidden
              "
            >

              {mobileMenuOpen ? (
                <X size={20} />
              ) : (
                <Menu size={20} />
              )}

            </button>

          </div>

        </div>


        {/* =================================================
            MOBILE MENU

            Smooth:
            opacity
            scale
            translateY

            Opens directly below navbar.
        ================================================= */}

        <div
          className={`
            relative
            z-40
            md:hidden

            ${
              mobileMenuOpen
                ? "visible"
                : "invisible"
            }
          `}
        >

          <div
            className={`
              absolute
              left-0
              right-0
              top-2
              origin-top
              transition-all
              duration-200
              ease-out

              ${
                mobileMenuOpen
                  ? `
                    translate-y-0
                    scale-100
                    opacity-100
                  `
                  : `
                    pointer-events-none
                    -translate-y-2
                    scale-[0.98]
                    opacity-0
                  `
              }
            `}
          >

            <div
              className="
                max-h-[calc(100vh-90px)]
                overflow-y-auto
                rounded-2xl
                border
                border-slate-200/80
                bg-white
                p-2
                shadow-[0_20px_50px_rgba(15,23,42,0.12)]
                backdrop-blur-xl

                dark:border-slate-800
                dark:bg-slate-950
                dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)]
              "
            >

              {/* =================================================
                  MOBILE NAV
              ================================================= */}

              <nav className="space-y-1">

                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active =
                    isActive(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`
                        flex
                        items-center
                        justify-between
                        rounded-xl
                        px-3
                        py-3
                        transition

                        ${
                          active
                            ? `
                              bg-slate-100
                              text-slate-950

                              dark:bg-slate-800
                              dark:text-white
                            `
                            : `
                              text-slate-600
                              hover:bg-slate-50
                              hover:text-slate-950

                              dark:text-slate-300
                              dark:hover:bg-slate-900
                              dark:hover:text-white
                            `
                        }
                      `}
                    >

                      <div
                        className="
                          flex
                          items-center
                          gap-3
                        "
                      >

                        <div
                          className={`
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg

                            ${
                              active
                                ? `
                                  bg-white
                                  shadow-sm

                                  dark:bg-slate-700
                                `
                                : `
                                  bg-slate-100

                                  dark:bg-slate-900
                                `
                            }
                          `}
                        >
                          <Icon size={17} />
                        </div>

                        <span
                          className="
                            text-sm
                            font-semibold
                          "
                        >
                          {item.name}
                        </span>

                      </div>

                      <ChevronRight
                        size={16}
                        className="
                          text-slate-400
                        "
                      />

                    </Link>
                  );
                })}

              </nav>


              {/* =================================================
                  MOBILE AUTH
              ================================================= */}

              {!loading && !user && (
                <div
                  className="
                    mt-2
                    border-t
                    border-slate-200
                    pt-2

                    dark:border-slate-800
                  "
                >

                  <Link
                    to="/login"
                    className="
                      flex
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      bg-slate-950
                      px-4
                      py-3
                      text-sm
                      font-semibold
                      text-white

                      dark:bg-white
                      dark:text-slate-950
                    "
                  >

                    <LogIn size={17} />

                    Login

                  </Link>

                </div>
              )}


              {/* =================================================
                  MOBILE USER
              ================================================= */}

              {!loading && user && (
                <div
                  className="
                    mt-2
                    space-y-2
                    border-t
                    border-slate-200
                    pt-2

                    dark:border-slate-800
                  "
                >

                  {/* User */}

                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      bg-slate-50
                      p-3

                      dark:bg-slate-900
                    "
                  >

                    <div
                      className="
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-white
                        shadow-sm

                        dark:bg-slate-800
                      "
                    >
                      <User size={17} />
                    </div>

                    <div className="min-w-0">

                      <p
                        className="
                          text-[10px]
                          font-semibold
                          uppercase
                          tracking-wider
                          text-slate-400
                        "
                      >
                        Signed in as
                      </p>

                      <p
                        className="
                          truncate
                          text-sm
                          font-semibold
                          text-slate-800

                          dark:text-slate-100
                        "
                      >
                        {user.email}
                      </p>

                    </div>

                  </div>


                  {/* Credits */}

                  <Link
                    to="/recharge"
                    className="
                      flex
                      items-center
                      justify-between
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      p-3
                      transition
                      hover:bg-slate-50

                      dark:border-slate-800
                      dark:bg-slate-900
                      dark:hover:bg-slate-800
                    "
                  >

                    <div
                      className="
                        flex
                        items-center
                        gap-3
                      "
                    >

                      <div
                        className="
                          flex
                          h-10
                          w-10
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-slate-100

                          dark:bg-slate-800
                        "
                      >
                        <Sparkles
                          size={17}
                          className="
                            text-slate-600
                            dark:text-slate-300
                          "
                        />
                      </div>

                      <div>

                        <p
                          className="
                            text-xs
                            font-medium
                            text-slate-400
                          "
                        >
                          Available balance
                        </p>

                        <p
                          className="
                            text-sm
                            font-bold
                            text-slate-900

                            dark:text-white
                          "
                        >
                          {user.credits} credits
                        </p>

                      </div>

                    </div>

                    <ChevronRight
                      size={17}
                      className="
                        text-slate-400
                      "
                    />

                  </Link>


                  {/* Logout */}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="
                      flex
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-slate-200
                      px-4
                      py-3
                      text-sm
                      font-semibold
                      text-slate-600
                      transition

                      hover:border-red-200
                      hover:bg-red-50
                      hover:text-red-600

                      dark:border-slate-800
                      dark:text-slate-300
                      dark:hover:border-red-900
                      dark:hover:bg-red-950/30
                      dark:hover:text-red-400
                    "
                  >

                    <LogOut size={17} />

                    Logout

                  </button>

                </div>
              )}

            </div>

          </div>

        </div>

      </div>

    </header>
  );
}

export default Navbar;

