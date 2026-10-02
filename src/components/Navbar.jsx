import {
  LogIn,
  LogOut,
  Sparkles,
  User,
} from "lucide-react";

import { Link } from "react-router-dom";

import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

function Navbar() {
  const {
    user,
    loading,
    logout,
  } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* LOGO */}

        <Link
          to="/"
          className="flex items-center gap-2 text-xl font-bold"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950">
            <div className="text-2xl font-black">
              <img src={logo} alt="Everything" className="h-5 w-5" />  
            </div>  
          </div>

          Everything
        </Link>


        {/* NAVIGATION */}

        <nav className="hidden items-center gap-8 md:flex">

          <Link
            to="/"
            className="text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            Home
          </Link>


          <Link
            to="/about"
            className="text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            About
          </Link>


          <Link
            to="/features"
            className="text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            Features
          </Link>


          <Link
            to="/contact"
            className="text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            Contact
          </Link>

        </nav>


        {/* RIGHT SIDE */}

        <div className="flex items-center gap-3">

          <ThemeToggle />


          {/* LOGIN */}

          {!loading && !user && (
            <Link
              to="/login"
              className="hidden items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 md:flex dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LogIn size={16} />

              Login
            </Link>
          )}


          {/* LOGGED IN USER */}

          {!loading && user && (
            <div className="flex items-center gap-2">

              {/* CREDITS */}

              <Link
                to="/recharge"
                className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 sm:flex"
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

              <div className="hidden items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800 sm:flex">

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

                <span className="hidden sm:inline">
                  Logout
                </span>

              </button>

            </div>
          )}

        </div>

      </div>
    </header>
  );
}

export default Navbar;
