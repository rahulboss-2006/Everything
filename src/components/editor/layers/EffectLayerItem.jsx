import { Eye, EyeOff, Pencil, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { layerCardClass } from "./layerStyles";

export default function EffectLayerItem({
  layer,
  index,
  total,
  onToggle,
  onEdit,
  onMove,
  onDelete,
}) {
  return (
    <div className={layerCardClass}>
      <button
        type="button"
        onClick={() => onToggle(layer.id)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-800"
      >
        {layer.visible === false ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
          {layer.name || layer.effectId}
        </div>
        <div className="text-[10px] text-slate-500">Effect</div>
      </div>

      <button
        type="button"
        onClick={() => onEdit(layer.id)}
        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-800"
      >
        <Pencil size={14} />
      </button>

      <button
        type="button"
        onClick={() => onMove(layer.id, "up")}
        disabled={index <= 0}
        className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-25"
      >
        <ChevronUp size={14} />
      </button>

      <button
        type="button"
        onClick={() => onMove(layer.id, "down")}
        disabled={index === total - 1}
        className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-25"
      >
        <ChevronDown size={14} />
      </button>

      <button
        type="button"
        onClick={() => onDelete(layer.id)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
