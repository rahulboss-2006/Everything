import { useRef, useState } from "react";
import {
  getEffectLabel,
  getEffectPreset,
} from "../utils/editorTools/effectHelpers";

/*
  Effects stack on top of each other (brightness 1.18 applied 13 times is
  about 8x brighter, contrast 1.35 stacked is pure black/white). Past
  this many effects the image turns solid white/black, so we stop here.
*/
export const MAX_EFFECTS = 10;

export default function useEffectLayers({
  editorControlsDisabled,
  canvasRef,
  setShowLayers,
  setShowEffects,
  setEffectPreviewSrc,
}) {
  const effectLayersRef = useRef([]);

  const [selectedEffects, setSelectedEffects] = useState([]);
  const [effectLayers, setEffectLayers] = useState([]);
  const [editingEffectLayerId, setEditingEffectLayerId] = useState(null);

  function syncEffectLayers(nextLayers) {
    effectLayersRef.current = nextLayers;
    setEffectLayers(nextLayers);
    setSelectedEffects(
      nextLayers
        .filter((layer) => layer.visible !== false)
        .map((layer) => layer.effectId)
    );
  }

  function clearEffects() {
    setSelectedEffects([]);
    effectLayersRef.current = [];
    setEffectLayers([]);
    setEditingEffectLayerId(null);
  }

  // Used by Undo/Redo.
  function restoreEffectLayers(layers) {
    syncEffectLayers(layers);
    setEditingEffectLayerId(null);
  }

  function createEffectLayer(effectId) {
    const preset = getEffectPreset(effectId);
    return {
      id: `effect-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      effectId,
      name: preset?.name || preset?.label || effectId,
      visible: true,
    };
  }

  function toggleEffect(effectId) {
    if (editorControlsDisabled || effectId === "Preview") return;

    const current = effectLayersRef.current || [];

    if (editingEffectLayerId) {
      const next = current.map((layer) =>
        layer.id === editingEffectLayerId
          ? {
              ...layer,
              effectId,
              name: getEffectLabel(effectId),
              visible: true,
            }
          : layer
      );
      syncEffectLayers(next);
      setEditingEffectLayerId(null);
      return;
    }

    const existingIndex = current.findIndex(
      (layer) => layer.effectId === effectId && layer.visible !== false
    );

    if (existingIndex !== -1) {
      syncEffectLayers(current.filter((_, index) => index !== existingIndex));
      return;
    }

    if (current.length >= MAX_EFFECTS) {
      alert(
        `You can stack up to ${MAX_EFFECTS} effects. Remove one, or press Apply to lock these in and keep editing.`
      );
      return;
    }

    syncEffectLayers([...current, createEffectLayer(effectId)]);
  }

  function handleDeleteEffectLayer(layerId) {
    if (editorControlsDisabled) return;
    syncEffectLayers(
      (effectLayersRef.current || []).filter((layer) => layer.id !== layerId)
    );
    if (editingEffectLayerId === layerId) setEditingEffectLayerId(null);
  }

  function handleToggleEffectLayer(layerId) {
    if (editorControlsDisabled) return;
    syncEffectLayers(
      (effectLayersRef.current || []).map((layer) =>
        layer.id === layerId
          ? { ...layer, visible: layer.visible === false }
          : layer
      )
    );
  }

  function handleMoveEffectLayer(layerId, direction) {
    if (editorControlsDisabled) return;
    const current = [...(effectLayersRef.current || [])];
    const index = current.findIndex((layer) => layer.id === layerId);
    if (index < 0) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= current.length) return;
    [current[index], current[target]] = [current[target], current[index]];
    syncEffectLayers(current);
  }

  function handleEditEffectLayer(layerId) {
    if (editorControlsDisabled) return;
    setEditingEffectLayerId(layerId);
    setShowLayers(false);
    try {
      if (canvasRef.current) {
        setEffectPreviewSrc(canvasRef.current.toDataURL("image/png"));
      }
    } catch {}
    setShowEffects(true);
  }

  return {
    selectedEffects,
    effectLayers,
    editingEffectLayerId,
    clearEffects,
    restoreEffectLayers,
    toggleEffect,
    handleDeleteEffectLayer,
    handleToggleEffectLayer,
    handleMoveEffectLayer,
    handleEditEffectLayer,
  };
}