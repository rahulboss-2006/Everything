export default function Footer() {
  return (
    <footer
      className="
        relative
        w-full
        border-t
        border-slate-200
        px-4
        py-8
        dark:border-slate-800
      "
    >
      <div
        className="
          mx-auto
          flex
          max-w-7xl
          items-center
          justify-center
          text-center
          text-sm
          text-slate-500
          dark:text-slate-400

          pr-8
          sm:pr-0
        "
      >
        <p>
          &copy; {new Date().getFullYear()} Everything. All rights reserved.
        </p>
      </div>

      {/* Rahul */}
      <p
        className="
          footer-text

          absolute

          right-3
          top-1/2
          -translate-y-1/2

          flex
          h-5
          w-5

          items-center
          justify-center

          rounded-full

          border
          border-slate-400

          text-[10px]
          font-bold

          text-slate-700

          dark:text-slate-200

          sm:right-6
        "
      >
        Rahul
      </p>
    </footer>
  );
}