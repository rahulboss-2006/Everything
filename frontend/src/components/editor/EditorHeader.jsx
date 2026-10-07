import { Undo2, Redo2, X } from "lucide-react";

const historyButtonClass =
  "flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white";

export default function EditorHeader({
  cropMode,
  isCropHovering,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClose,
  closeDisabled,
}) {
  return (
    <header
      className="
        relative
        flex
        shrink-0
        flex-wrap
        items-center
        justify-between
        gap-3
        border-b
        border-slate-200/70
        px-3
        py-3
        dark:border-white/10
        sm:px-6
        sm:py-4
      "
    >
      {/* =====================================================
          TITLE
      ===================================================== */}
      <div className="min-w-0 flex-1">
        <h2
          className="
            truncate
            text-base
            font-bold
            text-slate-900
            dark:text-white
            sm:text-lg
          "
        >
          Image Editor
        </h2>

        <p
          className="
            mt-0.5
            truncate
            text-[11px]
            text-slate-500
            dark:text-slate-400
            sm:text-xs
          "
        >
          Edit your image before conversion
        </p>
      </div>

      {/* =====================================================
          CROP INSTRUCTION
          Responsive — does not push other components
      ===================================================== */}
      {cropMode && isCropHovering && (
        <div
          className="
            pointer-events-none
            absolute
            left-1/2
            top-full
            z-[60]
            mt-2
            w-[calc(100%-1.5rem)]
            max-w-[720px]
            -translate-x-1/2

            rounded-xl
            border
            border-white/10
            bg-slate-950/90
            px-3
            py-2.5

            text-center
            text-[10px]
            font-medium
            leading-5
            text-white

            shadow-[0_10px_40px_rgba(0,0,0,0.35)]
            backdrop-blur-xl

            sm:w-auto
            sm:whitespace-nowrap
            sm:px-4
            sm:py-2
            sm:text-[11px]
          "
        >
          Hold

          <span
            className="
              mx-1
              rounded-md
              border
              border-white/20
              bg-white/10
              px-1
              py-0.5
              font-bold
              text-violet-300
              sm:mx-1.5
              sm:px-1.5
            "
          >
            mouse left button
          </span>

          + Drag to move crop handler

          <span className="mx-1.5 sm:mx-2">|</span>

          Scroll to zoom

          <span className="mx-1.5 sm:mx-2">|</span>

          Hold

          <span
            className="
              mx-1
              rounded-md
              border
              border-white/20
              bg-white/10
              px-1
              py-0.5
              font-bold
              text-violet-300
              sm:mx-1.5
              sm:px-1.5
            "
          >
            Ctrl
          </span>

          + Drag to move image
        </div>
      )}

      {/* =====================================================
          ACTION BUTTONS
      ===================================================== */}
      <div
        className="
          flex
          shrink-0
          items-center
          gap-1
          sm:gap-2
        "
      >
        {/* UNDO */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          className={historyButtonClass}
        >
          <Undo2 size={16} />

          <span className="hidden xs:inline sm:inline">
            Undo
          </span>
        </button>

        {/* REDO */}
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
          aria-label="Redo"
          className={historyButtonClass}
        >
          <Redo2 size={16} />

          <span className="hidden xs:inline sm:inline">
            Redo
          </span>
        </button>

        {/* CLOSE */}
        <button
          type="button"
          onClick={onClose}
          disabled={closeDisabled}
          aria-label="Close editor"
          title="Close"
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            text-slate-500
            transition
            hover:bg-slate-100
            hover:text-slate-900
            disabled:cursor-not-allowed
            disabled:opacity-50
            dark:hover:bg-white/10
            dark:hover:text-white
          "
        >
          <X size={20} />
        </button>
      </div>
    </header>
  );
}