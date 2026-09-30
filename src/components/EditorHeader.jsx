import { Undo2, Redo2, X } from "lucide-react";

const historyButtonClass =
  "flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white";

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
    <header className="flex shrink-0 items-center justify-between border-b border-slate-200/70 px-4 py-4 dark:border-white/10 sm:px-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Image Editor
        </h2>

        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Edit your image before conversion
        </p>
      </div>

      {cropMode && isCropHovering && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-[60] -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-slate-950/90 px-4 py-2 text-[11px] font-medium text-white shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">

          Hold

          <span className="mx-1.5 rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 font-bold text-violet-300">
            mouse left button
          </span>

          + Drag to move crop handler

          <span className="mx-2">|</span>

          <span className="text-slate-500">•</span>

          <span className="mx-2">|</span>

          Scroll to zoom

          <span className="mx-2">|</span>

          <span className="text-slate-500">•</span>

          <span className="mx-2">|</span>

          Hold

          <span className="mx-1.5 rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 font-bold text-violet-300">
            Ctrl
          </span>

          + Drag to move image

        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={historyButtonClass}
        >
          <Undo2 size={16} />
          Undo
        </button>

        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
          className={historyButtonClass}
        >
          <Redo2 size={16} />
          Redo
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={closeDisabled}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X size={20} />
        </button>
      </div>
    </header>
  );
}
