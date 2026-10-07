import { Pencil } from "lucide-react";
import { layerActionClass, layerCardClass, layerIconClass } from "./layerStyles";

export default function ObjectLayerItem({ layer, onEdit }) {
  return (
    <div className={layerCardClass}>
      <div className={layerIconClass}>✦</div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
          {layer.name}
        </div>
        <div className="text-[10px] text-slate-500">
          {layer.type === "ai-object" ? "AI Object Remove" : "Object Remove"}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onEdit(layer.id)}
        className={layerActionClass}
      >
        <Pencil size={12} /> Edit
      </button>
    </div>
  );
}
