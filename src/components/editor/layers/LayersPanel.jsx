import EffectLayerItem from "./EffectLayerItem";
import ObjectLayerItem from "./ObjectLayerItem";
import ToolLayerItem from "./ToolLayerItem";

export default function LayersPanel({
  allLayers,
  effectLayers,
  onClose,

  onToggleEffect,
  onEditEffect,
  onMoveEffect,
  onDeleteEffect,

  onEditObject,
  onRevertTool,
}) {
  return (
    <div className="fixed inset-0 z-[140] flex items-start justify-end bg-slate-950/25 p-3 backdrop-blur-[2px] sm:p-5">
      <div className="mt-12 flex max-h-[82vh] w-full max-w-[390px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-950 dark:text-white">
              Layers
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Effects and edit operations
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {allLayers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No layers yet.
            </div>
          ) : (
            <div className="space-y-2">
              {allLayers.map((layer) => {
                if (layer.layerType === "effect") {
                  return (
                    <EffectLayerItem
                      key={layer.id}
                      layer={layer}
                      index={effectLayers.findIndex((l) => l.id === layer.id)}
                      total={effectLayers.length}
                      onToggle={onToggleEffect}
                      onEdit={onEditEffect}
                      onMove={onMoveEffect}
                      onDelete={onDeleteEffect}
                    />
                  );
                }

                if (layer.layerType === "object") {
                  return (
                    <ObjectLayerItem
                      key={layer.id}
                      layer={layer}
                      onEdit={onEditObject}
                    />
                  );
                }

                return (
                  <ToolLayerItem
                    key={layer.id}
                    layer={layer}
                    onRevert={onRevertTool}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
