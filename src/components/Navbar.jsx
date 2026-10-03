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
  useRef,
  useState,
} from "react";

import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";

import logoLight from "../assets/logo-light.png";
import logoDark from "../assets/logo-dark.png";


/* =========================================================
   THEME DETECTION
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

  const navbarRef = useRef(null);

  const [currentTheme, setCurrentTheme] =
    useState(getCurrentTheme);

  const [menuOpen, setMenuOpen] =
    useState(false);


  /* =========================================================
     WATCH THEME
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

    const mediaQuery =
      window.matchMedia(
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
     CLOSE MENU WHEN ROUTE CHANGES
  ========================================================= */

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);


  /* =========================================================
     CLOSE MENU WITH ESC
  ========================================================= */

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);


  /* =========================================================
     CLOSE ON OUTSIDE CLICK
  ========================================================= */

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        navbarRef.current &&
        !navbarRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener(
        "mousedown",
        handleOutsideClick
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, [menuOpen]);


  /* =========================================================
     BODY SCROLL
  ========================================================= */

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);


  /* =========================================================
     LOGOUT
  ========================================================= */

  async function handleLogout() {
    setMenuOpen(false);
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
      ref={navbarRef}
      className="
        sticky
        top-0
        z-50
        w-full

        px-2
        pt-2

        sm:px-3
        sm:pt-3

        lg:px-5
      "
    >

      <div
        className="
          mx-auto
          w-full
          max-w-7xl
        "
      >

        {/* =====================================================
            MAIN NAVBAR
        ===================================================== */}

        <div
          className="
            relative
            z-50

            flex
            min-h-[62px]
            w-full
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
            dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]

            sm:min-h-[66px]
            sm:px-3

            lg:min-h-[68px]
            lg:px-4
          "
        >

          {/* ===================================================
              LOGO
          =================================================== */}

          <Link
            to="/"
            className="
              group
              flex
              min-w-0
              shrink-0
              items-center
              gap-2
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

                transition-transform
                duration-200

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


            <div className="hidden min-w-0 sm:block">

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


          {/* ===================================================
              DESKTOP NAV

              ONLY 1024px+
          =================================================== */}

          <nav
            className="
              hidden

              flex-1
              items-center
              justify-center
              gap-1

              lg:flex
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

                    rounded-xl

                    px-3
                    py-2.5

                    text-sm
                    font-medium

                    transition-all
                    duration-200

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


          {/* ===================================================
              RIGHT SIDE
          =================================================== */}

          <div
            className="
              ml-auto
              flex
              shrink-0
              items-center
              justify-end
              gap-1.5

              sm:gap-2
            "
          >

            {/* =================================================
                DESKTOP THEME

                IMPORTANT:
                No hidden inside ThemeToggle
            ================================================= */}

            <div
              className="
                hidden
                shrink-0
                items-center
                justify-center

                lg:!flex
              "
            >
              <ThemeToggle />
            </div>


            {/* =================================================
                DESKTOP LOGIN
            ================================================= */}

            {!loading && !user && (
              <Link
                to="/login"
                className="
                  hidden

                  shrink-0
                  items-center
                  gap-2

                  rounded-xl

                  bg-slate-950

                  px-4
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

                  lg:flex
                "
              >

                <LogIn size={16} />

                Login

              </Link>
            )}


            {/* =================================================
                DESKTOP USER
            ================================================= */}

            {!loading && user && (
              <div
                className="
                  hidden

                  items-center
                  gap-2

                  lg:flex
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

                    px-3
                    py-2

                    transition

                    hover:border-slate-300
                    hover:shadow-sm

                    dark:border-slate-700
                    dark:bg-slate-900
                    dark:hover:border-slate-600
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


                  <div className="hidden xl:block">

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

                    max-w-[180px]

                    items-center
                    gap-2

                    rounded-xl

                    border
                    border-slate-200

                    bg-slate-50

                    px-3
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
                TABLET + PHONE HAMBURGER

                < 1024px
            ================================================= */}

            <button
              type="button"
              onClick={() =>
                setMenuOpen(
                  (previous) => !previous
                )
              }
              aria-label={
                menuOpen
                  ? "Close menu"
                  : "Open menu"
              }
              aria-expanded={menuOpen}
              className="
                !flex

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

                hover:bg-slate-50

                active:scale-95

                dark:border-slate-700
                dark:bg-slate-900
                dark:text-slate-200
                dark:hover:bg-slate-800

                lg:hidden
              "
            >

              {menuOpen ? (
                <X size={20} />
              ) : (
                <Menu size={20} />
              )}

            </button>

          </div>

        </div>


        {/* =====================================================
            MOBILE / TABLET MENU

            SMOOTH TOP → BOTTOM
        ===================================================== */}

        <div
          className={`
            grid

            overflow-hidden

            transition-[grid-template-rows,opacity]
            duration-300
            ease-out

            lg:hidden

            ${
              menuOpen
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }
          `}
        >

          <div className="min-h-0 overflow-hidden">

            <div
              className="
                mt-2

                rounded-2xl

                border
                border-slate-200/80

                bg-white

                p-2

                shadow-[0_18px_45px_rgba(15,23,42,0.12)]

                dark:border-slate-800
                dark:bg-slate-950
                dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]
              "
            >

              {/* =================================================
                  THEME

                  FORCE VISIBLE
              ================================================= */}

              <div
                className="
                  mb-2

                  !flex
                  !visible
                  !opacity-100

                  min-h-[58px]

                  shrink-0

                  items-center
                  justify-between

                  rounded-xl

                  border
                  border-slate-200

                  bg-slate-50

                  px-3
                  py-2.5

                  dark:border-slate-800
                  dark:bg-slate-900
                "
              >

                <div className="min-w-0">

                  <p
                    className="
                      text-sm
                      font-semibold

                      text-slate-800

                      dark:text-white
                    "
                  >
                    Appearance
                  </p>

                  <p
                    className="
                      text-[11px]
                      text-slate-400
                    "
                  >
                    Change theme
                  </p>

                </div>


                {/* =================================================
                    THEME TOGGLE WRAPPER

                    NEVER HIDDEN
                ================================================= */}

                <div
                  className="
                    !flex
                    !visible
                    !opacity-100

                    shrink-0

                    items-center
                    justify-center
                  "
                >
                  <ThemeToggle />
                </div>

              </div>


              {/* =================================================
                  NAVIGATION
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

                        transition-colors
                        duration-200

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
                          shrink-0
                          text-slate-400
                        "
                      />

                    </Link>
                  );
                })}

              </nav>


              {/* =================================================
                  LOGGED OUT
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

                      transition

                      hover:shadow-md

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
                  LOGGED IN
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
                      className="text-slate-400"
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
