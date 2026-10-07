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

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [isDark, setIsDark] =
    useState(() => {
      if (typeof window === "undefined") {
        return false;
      }

      const root =
        document.documentElement;

      return (
        root.classList.contains("dark") ||
        root.dataset.theme === "dark"
      );
    });


  /* =========================================================
     WATCH DARK MODE
  ========================================================= */

  useEffect(() => {
    const updateTheme = () => {
      const root =
        document.documentElement;

      setIsDark(
        root.classList.contains("dark") ||
        root.dataset.theme === "dark"
      );
    };

    updateTheme();

    const observer =
      new MutationObserver(updateTheme);

    observer.observe(
      document.documentElement,
      {
        attributes: true,
        attributeFilter: [
          "class",
          "data-theme",
        ],
      }
    );

    if (document.body) {
      observer.observe(
        document.body,
        {
          attributes: true,
          attributeFilter: [
            "class",
            "data-theme",
          ],
        }
      );
    }

    return () => {
      observer.disconnect();
    };
  }, []);


  /* =========================================================
     CLOSE MENU ON ROUTE CHANGE
  ========================================================= */

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);


  /* =========================================================
     ESC CLOSE
  ========================================================= */

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
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
  }, [mobileMenuOpen]);


  /* =========================================================
     BODY SCROLL LOCK
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
     OUTSIDE CLICK
  ========================================================= */

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const handleOutsideClick = (event) => {
      if (
        navbarRef.current &&
        !navbarRef.current.contains(
          event.target
        )
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
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
     ACTIVE ROUTE
  ========================================================= */

  function isActive(path) {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname.startsWith(path);
  }


  /* =========================================================
     LOGO
  ========================================================= */

  const currentLogo = isDark
    ? logoDark
    : logoLight;


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
          relative
          mx-auto
          w-full
          max-w-7xl
        "
      >

        {/* ===================================================
            MAIN NAVBAR
        =================================================== */}

        <div
          className="
            relative
            z-50

            flex
            min-h-[62px]
            w-full
            items-center

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

          {/* =================================================
              LOGO
          ================================================= */}

          <Link
            to="/"
            className="
              group
              flex
              min-w-0
              shrink-0
              items-center
              gap-2.5
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
              LG+
          ================================================= */}

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

                    px-3.5
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


          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <div
            className="
              ml-auto
              flex
              shrink-0
              items-center
              gap-1.5

              sm:gap-2
            "
          >

            {/* =================================================
                DESKTOP THEME
                LG+
            ================================================= */}

            <div
              className="
                hidden
                shrink-0
                items-center
                justify-center

                lg:flex
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
                  justify-center
                  gap-2

                  rounded-xl

                  bg-[#0E172B]

                  px-4
                  py-2.5

                  text-sm
                  font-semibold
                  text-white

                  shadow-sm

                  transition-all
                  duration-200

                  hover:-translate-y-0.5
                  hover:shadow-md

                  dark:bg-[#0E172B]
                  dark:text-white

                  lg:flex
                "
              >
                <LogIn
                  size={16}
                  className="shrink-0"
                />

                <span className="whitespace-nowrap">
                  Login
                </span>
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

                {/* CREDIT */}

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


                {/* USER */}

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


                {/* LOGOUT */}

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
                HAMBURGER
                TABLET + PHONE
            ================================================= */}

            <button
              type="button"

              onClick={() =>
                setMobileMenuOpen(
                  (previous) => !previous
                )
              }

              aria-label={
                mobileMenuOpen
                  ? "Close menu"
                  : "Open menu"
              }

              aria-expanded={
                mobileMenuOpen
              }

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

                hover:bg-slate-50

                active:scale-95

                dark:border-slate-700
                dark:bg-slate-900
                dark:text-slate-200
                dark:hover:bg-slate-800

                lg:hidden
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


        {/* =====================================================
            MOBILE/TABLET MENU OVERLAY

            IMPORTANT:
            absolute হওয়ায় নিচের component সরবে না।
        ===================================================== */}

        <div
          className={`
            absolute
            left-0
            right-0
            top-[calc(100%+8px)]

            z-40

            lg:hidden

            origin-top

            transition-all
            duration-300

            ease-[cubic-bezier(0.22,1,0.36,1)]

            ${
              mobileMenuOpen
                ? `
                  visible
                  pointer-events-auto
                  translate-y-0
                  scale-y-100
                  opacity-100
                `
                : `
                  invisible
                  pointer-events-none
                  -translate-y-3
                  scale-y-95
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

              bg-white/98

              p-2

              shadow-[0_20px_50px_rgba(15,23,42,0.14)]

              backdrop-blur-2xl

              dark:border-slate-800
              dark:bg-slate-950/98
              dark:shadow-[0_20px_50px_rgba(0,0,0,0.35)]

              overscroll-contain

              [scrollbar-width:thin]
            "
          >

            {/* =================================================
                THEME
            ================================================= */}

            <div
              className="
                flex
                min-h-[64px]
                w-full

                items-center
                justify-between

                gap-3

                rounded-xl

                border
                border-slate-200/80

                bg-slate-50

                px-3
                py-2

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
                    mt-0.5

                    text-[11px]

                    text-slate-400
                  "
                >
                  Choose your preferred theme
                </p>

              </div>


              {/* THEME CONTROL */}

              <div
                className="
                  flex
                  shrink-0
                  items-center
                  justify-center

                  rounded-xl

                  bg-white

                  p-0.5

                  shadow-sm

                  ring-1
                  ring-slate-200/70

                  dark:bg-slate-950
                  dark:ring-slate-700/70
                "
              >
                <ThemeToggle />
              </div>

            </div>


            {/* =================================================
                NAVIGATION
            ================================================= */}

            <nav className="mt-2 space-y-1">

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
                      min-h-[50px]

                      items-center
                      justify-between

                      rounded-xl

                      px-3

                      transition-all
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
                    min-h-[50px]
                    w-full

                    items-center
                    justify-center
                    gap-2

                    rounded-xl

                    bg-[#0E172B]

                    px-4

                    text-sm
                    font-semibold
                    text-white

                    shadow-sm

                    transition-all
                    duration-200

                    hover:-translate-y-0.5
                    hover:shadow-md

                    dark:bg-[#0E172B]
                    dark:text-white
                  "
                >

                  <LogIn
                    size={17}
                    className="shrink-0"
                  />

                  <span className="whitespace-nowrap">
                    Login
                  </span>

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

                {/* USER CARD */}

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


                {/* CREDIT */}

                <Link
                  to="/recharge"

                  className="
                    flex
                    min-h-[62px]

                    items-center
                    justify-between

                    rounded-xl

                    border
                    border-slate-200

                    bg-white

                    px-3

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


                {/* LOGOUT */}

                <button
                  type="button"
                  onClick={handleLogout}

                  className="
                    flex
                    min-h-[50px]
                    w-full

                    items-center
                    justify-center
                    gap-2

                    rounded-xl

                    border
                    border-slate-200

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

    </header>
  );
}

export default Navbar;

