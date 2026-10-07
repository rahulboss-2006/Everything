import { Crop, Maximize2, Scissors, SlidersHorizontal, Undo2 } from "lucide-react";
import { layerActionClass, layerCardClass, layerIconClass } from "./layerStyles";

/* crop / resize / background / apply */
export default function ToolLayerItem({ layer, onRevert }) {
  const ToolIcon =
    layer.type === "crop"
      ? Crop
      : layer.type === "resize"
      ? Maximize2
      : layer.type === "background"
      ? Scissors
      : SlidersHorizontal;

  return (
    <div className={layerCardClass}>
      <div className={layerIconClass}>
        <ToolIcon size={15} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
          {layer.name}
        </div>
        {layer.detail && (
          <div className="truncate text-[10px] text-slate-500">
            {layer.detail}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onRevert(layer.id)}
        className={layerActionClass}
      >
        <Undo2 size={12} /> Revert
      </button>
    </div>
  );
}
