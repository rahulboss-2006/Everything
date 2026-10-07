import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center px-4 py-20 text-center">
      <div className="max-w-md">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-500">
          Error 404
        </p>

        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
          Page not found
        </h1>

        <p className="mt-4 text-slate-600 dark:text-slate-400">
          The page you are looking for does not exist or was moved.
        </p>

        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-slate-900"
        >
          Back to home
        </Link>
      </div>
    </section>
  );
}
