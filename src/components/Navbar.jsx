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


/* =========================================
   THEME DETECTION
========================================= */

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


/* =========================================
   NAVIGATION
========================================= */

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


  /* =========================================
     THEME WATCHER
  ========================================= */

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

    const systemTheme =
      window.matchMedia(
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
     CLOSE MENU WHEN ROUTE CHANGES
  ========================================= */

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);


  /* =========================================
     BODY SCROLL LOCK
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
     CLOSE MENU WHEN RESIZING TO DESKTOP
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
     LOGOUT
  ========================================= */

  async function handleLogout() {
    setMobileMenuOpen(false);
    await logout();
  }


  /* =========================================
     LOGO
  ========================================= */

  const currentLogo =
    currentTheme === "dark"
      ? logoDark
      : logoLight;


  /* =========================================
     ACTIVE ROUTE
  ========================================= */

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
        px-3
        pt-3
        sm:px-4
        lg:px-6
      "
    >

      <div className="mx-auto max-w-7xl">

        {/* =========================================
            MAIN NAVBAR
        ========================================= */}

        <div
          className="
            relative
            z-50
            flex
            h-16
            items-center
            justify-between
            rounded-2xl
            border
            border-slate-200/70
            bg-white/90
            px-3
            shadow-[0_8px_30px_rgba(15,23,42,0.06)]
            backdrop-blur-xl

            dark:border-slate-800
            dark:bg-slate-950/90
            dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)]

            sm:h-[68px]
            sm:px-4
            lg:px-5
          "
        >

          {/* =========================================
              LOGO
          ========================================= */}

          <Link
            to="/"
            onClick={() =>
              setMobileMenuOpen(false)
            }
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


            <div className="hidden min-w-0 sm:block">

              <div
                className="
                  truncate
                  text-base
                  font-bold
                  tracking-tight
                  text-slate-950
                  dark:text-white

                  sm:text-[17px]
                "
              >
                Everything
              </div>

              <div
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
              </div>

            </div>

          </Link>


          {/* =========================================
              DESKTOP NAVIGATION
          ========================================= */}

          <nav
            className="
              absolute
              left-1/2
              hidden
              -translate-x-1/2
              items-center
              gap-1
              md:flex
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
                    rounded-xl
                    px-3
                    py-2
                    text-sm
                    font-medium
                    transition-all
                    duration-200
                    lg:px-4
                    lg:py-2.5

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


          {/* =========================================
              RIGHT SIDE
          ========================================= */}

          <div
            className="
              flex
              shrink-0
              items-center
              gap-1.5
              sm:gap-2
            "
          >

            <ThemeToggle />


            {/* =========================================
                DESKTOP LOGIN
            ========================================= */}

            {!loading && !user && (
              <Link
                to="/login"
                className="
                  hidden
                  items-center
                  gap-2
                  rounded-xl
                  bg-slate-950
                  px-3.5
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
                  lg:px-4
                "
              >
                <LogIn size={16} />
                <span>Login</span>
              </Link>
            )}


            {/* =========================================
                DESKTOP USER
            ========================================= */}

            {!loading && user && (
              <div
                className="
                  hidden
                  items-center
                  gap-2
                  md:flex
                "
              >

                {/* CREDITS */}

                <Link
                  to="/recharge"
                  className="
                    flex
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-2.5
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

                    <div
                      className="
                        text-[9px]
                        font-semibold
                        uppercase
                        tracking-wider
                        text-slate-400
                      "
                    >
                      Balance
                    </div>

                    <div
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
                    </div>

                  </div>

                </Link>


                {/* USER EMAIL */}

                <div
                  className="
                    hidden
                    max-w-[170px]
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    px-3
                    py-2

                    lg:flex

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


            {/* =========================================
                MOBILE MENU BUTTON
            ========================================= */}

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
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                text-slate-700
                shadow-sm
                transition
                duration-200
                hover:bg-slate-50
                active:scale-95

                dark:border-slate-700
                dark:bg-slate-900
                dark:text-slate-200
                dark:hover:bg-slate-800

                md:hidden
              "
            >

              <span
                className="
                  transition-transform
                  duration-200
                "
              >
                {mobileMenuOpen ? (
                  <X size={20} />
                ) : (
                  <Menu size={20} />
                )}
              </span>

            </button>

          </div>

        </div>


        {/* =========================================
            MOBILE MENU

            IMPORTANT:
            No max-height animation.
            It fades/slides from navbar downward.
        ========================================= */}

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
              duration-250
              ease-out

              ${
                mobileMenuOpen
                  ? `
                    translate-y-0
                    scale-y-100
                    opacity-100
                  `
                  : `
                    -translate-y-2
                    scale-y-95
                    opacity-0
                    pointer-events-none
                  `
              }
            `}
          >

            <div
              className="
                overflow-hidden
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

              {/* =========================================
                  NAV LINKS
              ========================================= */}

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
                          text-slate-400
                        "
                      />

                    </Link>
                  );
                })}

              </nav>


              {/* =========================================
                  LOGGED OUT
              ========================================= */}

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
                      shadow-sm
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


              {/* =========================================
                  LOGGED IN
              ========================================= */}

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

                  {/* USER */}

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


                  {/* CREDITS */}

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


                  {/* LOGOUT */}

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

