export default function Footer() {
  return (
    <footer className="relative border-t border-slate-200 px-4 py-8 dark:border-slate-800">

      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 text-center text-sm text-slate-500 sm:flex-row">

        <p>
          &copy; {new Date().getFullYear()} Everything. All rights reserved.
        </p>

      </div>

      <p className="footer-text absolute right-6 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-slate-400 text-[10px] font-bold text-slate-700 dark:text-slate-200">
        Rahul
      </p>

    </footer>
  );
}