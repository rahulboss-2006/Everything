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

  return window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches
    ? "dark"
    : "light";
}


/* =========================================
   NAVIGATION ITEMS
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
     WATCH THEME CHANGES
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
     CLOSE MOBILE MENU ON ROUTE CHANGE
  ========================================= */

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);


  /* =========================================
     LOCK BODY SCROLL
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
    <>
      {/* =========================================
          NAVBAR
      ========================================= */}

      <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5 lg:px-6">

        <div className="mx-auto max-w-7xl">

          <div
            className="
              relative
              flex
              h-[68px]
              items-center
              justify-between
              rounded-2xl
              border
              border-slate-200/70
              bg-white/80
              px-3
              shadow-[0_8px_30px_rgb(0,0,0,0.04)]
              backdrop-blur-2xl

              dark:border-slate-800/80
              dark:bg-slate-950/80
              dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]

              sm:px-4
              lg:px-5
            "
          >

            {/* =========================================
                LOGO
            ========================================= */}

            <Link
              to="/"
              className="
                group
                flex
                shrink-0
                items-center
                gap-2.5
              "
            >

              <div
                className="
                  relative
                  flex
                  h-11
                  w-11
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
                  group-hover:shadow-md

                  dark:border-slate-700
                  dark:bg-slate-900
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


              <div className="hidden xs:block">

                <div
                  className="
                    text-[17px]
                    font-bold
                    tracking-tight
                    text-slate-950
                    dark:text-white
                  "
                >
                  Everything
                </div>

                <div
                  className="
                    hidden
                    text-[10px]
                    font-medium
                    uppercase
                    tracking-[0.18em]
                    text-slate-400
                    sm:block
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
                const active = isActive(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      relative
                      rounded-xl
                      px-4
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


            {/* =========================================
                RIGHT ACTIONS
            ========================================= */}

            <div className="flex items-center gap-2">

              <ThemeToggle />


              {/* =========================================
                  DESKTOP LOGGED OUT
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
                    px-4
                    py-2.5
                    text-sm
                    font-semibold
                    text-white
                    shadow-sm
                    transition
                    duration-200
                    hover:-translate-y-0.5
                    hover:shadow-lg

                    dark:bg-white
                    dark:text-slate-950

                    md:flex
                  "
                >

                  <LogIn size={16} />

                  <span>
                    Login
                  </span>

                </Link>
              )}


              {/* =========================================
                  DESKTOP LOGGED IN
              ========================================= */}

              {!loading && user && (
                <div className="hidden items-center gap-2 md:flex">

                  {/* CREDITS */}

                  <Link
                    to="/recharge"
                    className="
                      group
                      flex
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
                          text-[10px]
                          font-medium
                          uppercase
                          tracking-wide
                          text-slate-400
                        "
                      >
                        Balance
                      </div>

                      <div
                        className="
                          text-sm
                          font-bold
                          leading-none
                          text-slate-900
                          dark:text-white
                        "
                      >
                        {user.credits}
                        <span
                          className="
                            ml-1
                            text-xs
                            font-medium
                            text-slate-400
                          "
                        >
                          credits
                        </span>
                      </div>

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
                      dark:hover:bg-red-950/40
                      dark:hover:text-red-400
                    "
                    aria-label="Logout"
                    title="Logout"
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
                  hover:bg-slate-50

                  dark:border-slate-700
                  dark:bg-slate-900
                  dark:text-slate-200
                  dark:hover:bg-slate-800

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


          {/* =========================================
              MOBILE MENU
          ========================================= */}

          <div
            className={`
              overflow-hidden
              transition-all
              duration-300
              ease-out
              md:hidden

              ${
                mobileMenuOpen
                  ? "max-h-[calc(100vh-100px)] opacity-100"
                  : "pointer-events-none max-h-0 opacity-0"
              }
            `}
          >

            <div
              className="
                mt-2
                overflow-hidden
                rounded-2xl
                border
                border-slate-200/70
                bg-white/95
                p-2
                shadow-[0_20px_50px_rgb(0,0,0,0.08)]
                backdrop-blur-2xl

                dark:border-slate-800
                dark:bg-slate-950/95
                dark:shadow-[0_20px_50px_rgb(0,0,0,0.3)]
              "
            >

              {/* =========================================
                  MOBILE NAV LINKS
              ========================================= */}

              <div className="space-y-1">

                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

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

                      <div className="flex items-center gap-3">

                        <div
                          className={`
                            flex
                            h-9
                            w-9
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

                        <span className="text-sm font-semibold">
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

              </div>


              {/* =========================================
                  MOBILE AUTH
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
                  MOBILE USER
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


                  {/* CREDIT CARD */}

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

                    <div className="flex items-center gap-3">

                      <div
                        className="
                          flex
                          h-10
                          w-10
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

      </header>
    </>
  );
}

export default Navbar;
