import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

import {
  verifyResetOTP,
  resetPassword,
} from "../services/authApi";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [otpVerified, setOtpVerified] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  /* =========================================
     LOAD EMAIL
  ========================================= */

  useEffect(() => {
    const savedEmail = sessionStorage.getItem(
      "passwordResetEmail"
    );

    if (!savedEmail) {
      navigate("/forgot-password", {
        replace: true,
      });

      return;
    }

    setEmail(savedEmail);
  }, [navigate]);

  /* =========================================
     VERIFY OTP
  ========================================= */

  async function handleVerifyOTP(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email) {
      setError(
        "Email is missing. Please start again."
      );
      return;
    }

    if (otp.length !== 6) {
      setError(
        "Please enter the 6-digit verification code."
      );
      return;
    }

    setLoading(true);

    try {
      const result =
        await verifyResetOTP(
          email,
          otp
        );

      if (!result?.success) {
        throw new Error(
          result?.message ||
            "Invalid verification code."
        );
      }

      setOtpVerified(true);

      setMessage(
        "Code verified. Enter your new password."
      );
    } catch (error) {
      console.error(
        "Reset OTP verification error:",
        error
      );

      setError(
        error?.message ||
          "Unable to verify the code."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================
     RESET PASSWORD
  ========================================= */

  async function handleResetPassword(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email || !otp) {
      setError(
        "Reset information is missing. Please start again."
      );
      return;
    }

    if (newPassword.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    setLoading(true);

    try {
      const result =
        await resetPassword(
          email,
          otp,
          newPassword
        );

      if (!result?.success) {
        throw new Error(
          result?.message ||
            "Unable to reset password."
        );
      }

      /*
        Password reset completed.
      */

      sessionStorage.removeItem(
        "passwordResetEmail"
      );

      setMessage(
        "Password changed successfully. Redirecting to login..."
      );

      /*
        Redirect to login after success.
      */

      setTimeout(() => {
        navigate("/login", {
          replace: true,
          state: {
            message:
              "Password changed successfully. Please login with your new password.",
          },
        });
      }, 1200);
    } catch (error) {
      console.error(
        "Reset password error:",
        error
      );

      setError(
        error?.message ||
          "Unable to reset password."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================
     BACK
  ========================================= */

  function goBack() {
    if (otpVerified) {
      setOtpVerified(false);
      setError("");
      setMessage("");
      return;
    }

    navigate("/forgot-password");
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
      {/* Theme */}
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      {/* Header */}
      <header className="border-b border-slate-200/70 dark:border-slate-800/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-xl font-bold"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950">
              <Sparkles size={18} />
            </div>

            Everything
          </button>

          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft size={16} />

            Back
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-950">
              {otpVerified ? (
                <Lock size={26} />
              ) : (
                <ShieldCheck size={26} />
              )}
            </div>
          </div>

          {/* Title */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">
              {otpVerified
                ? "Create new password"
                : "Verify reset code"}
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {otpVerified
                ? "Choose a new password for your account."
                : `Enter the 6-digit code sent to ${email}`}
            </p>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            {/* Error */}
            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}

            {/* Message */}
            {message && (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                {message}
              </div>
            )}

            {/* =================================
                OTP FORM
            ================================= */}

            {!otpVerified ? (
              <form
                onSubmit={handleVerifyOTP}
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
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-semibold tracking-[0.4em] outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-slate-800"
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
                    : "Verify code"}
                </button>
              </form>
            ) : (
              /* =================================
                 NEW PASSWORD FORM
              ================================= */

              <form
                onSubmit={
                  handleResetPassword
                }
                className="space-y-5"
              >
                {/* New password */}
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    New password
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
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) =>
                        setNewPassword(
                          event.target.value
                        )
                      }
                      placeholder="Enter new password"
                      disabled={loading}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-slate-800"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value
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

                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Password must be at least 8
                    characters.
                  </p>
                </div>

                {/* Confirm password */}
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Confirm new password
                  </label>

                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(
                          event.target.value
                        )
                      }
                      placeholder="Confirm new password"
                      disabled={loading}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-slate-800"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (value) => !value
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      aria-label={
                        showConfirmPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !newPassword ||
                    !confirmPassword
                  }
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  {loading
                    ? "Changing password..."
                    : "Change password"}
                </button>
              </form>
            )}

            {/* Login */}
            <div className="mt-6 border-t border-slate-200 pt-6 text-center dark:border-slate-800">
              <button
                type="button"
                onClick={() =>
                  navigate("/login")
                }
                className="text-sm font-semibold text-slate-700 hover:underline dark:text-slate-300"
              >
                Back to login
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
