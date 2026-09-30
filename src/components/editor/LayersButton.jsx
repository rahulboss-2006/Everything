import { Layers } from "lucide-react";

export default function LayersButton({ count, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="absolute right-3 top-3 z-30 flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
      title="Layers"
    >
      <Layers size={15} />
      Layers
      {count > 0 && (
        <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] text-white">
          {count}
        </span>
      )}
    </button>
  );
}
