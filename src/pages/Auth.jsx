import { useState } from "react";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  loginUser,
  registerUser,
  verifyEmail,
} from "../services/authApi";

import {
  setAccessToken,
  setRefreshToken,
} from "../utils/api";

import { useAuth } from "../context/AuthContext";

import ThemeToggle from "../components/ThemeToggle";

import { useNavigate } from "react-router-dom";


export default function Auth() {
  const initialMode =
    window.location.hash === "#/register"
      ? "register"
      : "login";

  const navigate = useNavigate();

  const [mode, setMode] =
    useState(initialMode);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [otp, setOtp] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [step, setStep] =
    useState("form");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const { login } = useAuth();


  /* =========================================
     GO HOME
  ========================================= */

  function goHome() {
    window.location.hash = "#/";
  }


  /* =========================================
     SWITCH LOGIN / REGISTER
  ========================================= */

  function switchMode(nextMode) {
    setMode(nextMode);

    setStep("form");

    setError("");

    setMessage("");

    setPassword("");

    setOtp("");

    navigate(
      nextMode === "register"
        ? "/register"
        : "/login"
    );
  }


  /* =========================================
     LOGIN / REGISTER
  ========================================= */

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      /* ================================
         VALIDATION
      ================================ */

      if (!email.trim()) {
        throw new Error(
          "Please enter your email."
        );
      }

      if (!password) {
        throw new Error(
          "Please enter your password."
        );
      }


      /* ================================
         REGISTER
      ================================ */

      if (mode === "register") {
        const result =
          await registerUser(
            email.trim(),
            password
          );

        if (!result?.success) {
          throw new Error(
            result?.message ||
            "Registration failed."
          );
        }

        setStep("otp");

        setMessage(
          "Verification code sent to your email."
        );

        return;
      }


      /* ================================
         LOGIN
      ================================ */

      const result =
        await loginUser(
          email.trim(),
          password
        );

      if (!result?.success) {
        throw new Error(
          result?.message ||
          "Login failed."
        );
      }


      /* ================================
         SAVE ACCESS TOKEN
      ================================ */

      if (result?.accessToken) {
        setAccessToken(
          result.accessToken
        );
      }


      /* ================================
         SAVE REFRESH TOKEN
      ================================ */

      if (result?.refreshToken) {
        setRefreshToken(
          result.refreshToken
        );
      } else {
        /*
          Backend should always return
          refreshToken after successful login.
        */

        console.error(
          "LOGIN ERROR: refreshToken was not returned by server."
        );

        throw new Error(
          "Login succeeded, but the refresh token was not received. Please try again."
        );
      }


      /* ================================
         UPDATE AUTH CONTEXT
      ================================ */

      if (result?.user) {
        await login(result.user);
      }


      /* ================================
         DEBUG
      ================================ */

      console.log(
        "LOGIN SUCCESS"
      );

      console.log(
        "Access token saved:",
        Boolean(
          localStorage.getItem(
            "accessToken"
          )
        )
      );

      console.log(
        "Refresh token saved:",
        Boolean(
          localStorage.getItem(
            "refreshToken"
          )
        )
      );


      /* ================================
         GO HOME
      ================================ */

      window.location.hash = "#/";
    } catch (err) {
      console.error(
        "AUTH ERROR:",
        err
      );

      setError(
        err?.message ||
        "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }


  /* =========================================
     VERIFY EMAIL
  ========================================= */

  async function handleVerify(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!otp.trim()) {
      setError(
        "Please enter the verification code."
      );

      return;
    }

    setLoading(true);

    try {
      const result =
        await verifyEmail(
          email.trim(),
          otp.trim()
        );

      if (!result?.success) {
        throw new Error(
          result?.message ||
          "Verification failed."
        );
      }

      setMessage(
        "Email verified successfully. You can now login."
      );

      setStep("form");

      setMode("login");

      setPassword("");

      setOtp("");

      navigate("/login");
    } catch (err) {
      console.error(
        "OTP ERROR:",
        err
      );

      setError(
        err?.message ||
        "Verification failed."
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">

      {/* =====================================
          THEME TOGGLE
      ===================================== */}

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>


      {/* =====================================
          TOP BAR
      ===================================== */}

      <header className="border-b border-slate-200/70 dark:border-slate-800/70">

        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

          <a
            href="/"
            className="flex items-center gap-2 text-xl font-bold"
          >

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950">
              <Sparkles size={18} />
            </div>

            Everything

          </a>


          <button
            type="button"
            onClick={goHome}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft size={16} />

            Back to home
          </button>

        </div>

      </header>


      {/* =====================================
          AUTH MAIN
      ===================================== */}

      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">

        <div className="w-full max-w-md">


          {/* =================================
              ICON
          ================================= */}

          <div className="mb-6 flex justify-center">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-950">

              {step === "otp" ? (
                <ShieldCheck size={26} />
              ) : (
                <Lock size={26} />
              )}

            </div>

          </div>


          {/* =================================
              TITLE
          ================================= */}

          <div className="mb-8 text-center">

            <h1 className="text-3xl font-bold">

              {step === "otp"
                ? "Verify your email"
                : mode === "login"
                  ? "Welcome back"
                  : "Create your account"}

            </h1>


            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">

              {step === "otp"
                ? `Enter the verification code sent to ${email}`
                : mode === "login"
                  ? "Login to continue using Everything."
                  : "Create an account and start converting files."}

            </p>

          </div>


          {/* =================================
              CARD
          ================================= */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">


            {/* =================================
                ERROR
            ================================= */}

            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}


            {/* =================================
                MESSAGE
            ================================= */}

            {message && (
              <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {message}
              </div>
            )}


            {/* =================================
                OTP
            ================================= */}

            {step === "otp" ? (

              <form
                onSubmit={handleVerify}
                className="space-y-5"
              >

                <div>

                  <label className="mb-2 block text-sm font-semibold">
                    Verification code
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(event) =>
                      setOtp(
                        event.target.value.replace(
                          /\D/g,
                          ""
                        )
                      )
                    }
                    placeholder="Enter 6-digit code"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-semibold tracking-[0.4em] outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-slate-800"
                  />

                </div>


                <button
                  type="submit"
                  disabled={
                    loading ||
                    otp.length !== 6
                  }
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >

                  {loading
                    ? "Verifying..."
                    : "Verify email"}

                </button>


                <button
                  type="button"
                  onClick={() => {
                    setStep("form");
                    setError("");
                    setMessage("");
                  }}
                  className="w-full text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Use a different email
                </button>

              </form>

            ) : (

              /* =================================
                 LOGIN / REGISTER FORM
              ================================= */

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >


                {/* =============================
                    EMAIL
                ============================= */}

                <div>

                  <label className="mb-2 block text-sm font-semibold">
                    Email
                  </label>

                  <div className="relative">

                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value
                        )
                      }
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-slate-800"
                    />

                  </div>

                </div>


                {/* =============================
                    PASSWORD
                ============================= */}

                <div>

                  <label className="mb-2 block text-sm font-semibold">
                    Password
                  </label>

                  <div className="relative">

                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete={
                        mode === "login"
                          ? "current-password"
                          : "new-password"
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-slate-800"
                    />


                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) =>
                            !value
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >

                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}

                    </button>

                  </div>


                  {mode === "register" && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Password must be at least 8 characters.
                    </p>
                  )}

                </div>


                {/* =============================
                    SUBMIT
                ============================= */}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >

                  {loading
                    ? mode === "login"
                      ? "Logging in..."
                      : "Creating account..."
                    : mode === "login"
                      ? "Login"
                      : "Create account"}

                </button>

              </form>
            )}

            <button
              type="button"
              onClick={() =>
                navigate("/forgot-password")
              }
              className="text-sm text-violet-500 hover:text-violet-400 pt-2"
            >
              Forgot Password?
            </button>


            {/* =================================
                SWITCH LOGIN / REGISTER
            ================================= */}

            {step === "form" && (

              <div className="mt-6 border-t border-slate-200 pt-6 text-center dark:border-slate-800">

                <p className="text-sm text-slate-500 dark:text-slate-400">

                  {mode === "login"
                    ? "Don't have an account?"
                    : "Already have an account?"}

                </p>


                <button
                  type="button"
                  onClick={() =>
                    switchMode(
                      mode === "login"
                        ? "register"
                        : "login"
                    )
                  }
                  className="mt-2 text-sm font-semibold text-slate-900 hover:underline dark:text-white"
                >

                  {mode === "login"
                    ? "Create an account"
                    : "Login instead"}

                </button>

              </div>

            )}

          </div>

        </div>

      </main>

    </div>
  );
}




