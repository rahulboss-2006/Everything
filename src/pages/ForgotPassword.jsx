import { useState } from "react";
import { ArrowLeft, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { forgotPassword } from "../services/authApi";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);

    try {
      const result = await forgotPassword(normalizedEmail);

      if (!result?.success) {
        throw new Error(
          result?.message ||
            "Unable to send password reset code."
        );
      }

      /*
        Save email temporarily so ResetPassword
        can use it after navigation.
      */
      sessionStorage.setItem(
        "passwordResetEmail",
        normalizedEmail
      );

      setMessage(
        "Password reset code has been sent to your email."
      );

      /*
        Go directly to OTP/reset page.
      */
      setTimeout(() => {
        navigate("/reset-password");
      }, 700);
    } catch (error) {
      console.error(
        "Forgot password error:",
        error
      );

      setError(
        error?.message ||
          "Unable to send password reset code."
      );
    } finally {
      setLoading(false);
    }
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
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to login
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-950">
              <ShieldCheck size={26} />
            </div>
          </div>

          {/* Title */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">
              Forgot your password?
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Enter your email and we will send you a
              verification code.
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

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* Email */}
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
                      setEmail(event.target.value)
                    }
                    placeholder="you@example.com"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-slate-800"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={
                  loading || !email.trim()
                }
                className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {loading
                  ? "Sending code..."
                  : "Send reset code"}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-200 pt-6 text-center dark:border-slate-800">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-sm font-semibold text-slate-700 hover:underline dark:text-slate-300"
              >
                Remember your password? Login
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
