import { useRef, useState } from "react";

/*
  Object layers (object remove / AI object remove),
  tool layers (crop / resize / background / apply)
  and the "applied edits" summary list.
*/
export default function useEditLayers() {
  const objectLayersRef = useRef([]);
  const toolLayersRef = useRef([]);
  const appliedActionsRef = useRef([]);

  // Monotonic counter so every object/tool layer has a stable order.
  const layerSeqRef = useRef(0);

  const [objectLayers, setObjectLayers] = useState([]);
  const [toolLayers, setToolLayers] = useState([]);
  const [appliedEdits, setAppliedEdits] = useState([]);

  const randomId = () => Math.random().toString(36).slice(2, 8);

  function setAppliedActions(list) {
    appliedActionsRef.current = list;
    setAppliedEdits(list);
  }

  function addAppliedAction(action) {
    setAppliedActions([...appliedActionsRef.current, action]);
  }

  function addToolLayer({ type, name, detail, beforeFile, summary }) {
    const layer = {
      id: `tool-${type}-${Date.now()}-${randomId()}`,
      seq: ++layerSeqRef.current,
      type,
      name,
      detail,
      summary,
      beforeFile,
    };

    toolLayersRef.current = [...toolLayersRef.current, layer];
    setToolLayers([...toolLayersRef.current]);
    return layer;
  }

  function addObjectLayer(fields) {
    const layer = {
      id: `${fields.type}-${Date.now()}-${randomId()}`,
      seq: ++layerSeqRef.current,
      visible: true,
      ...fields,
    };

    objectLayersRef.current = [...objectLayersRef.current, layer];
    setObjectLayers([...objectLayersRef.current]);
    return layer;
  }

  // Drop every object/tool layer created at or after `seq`.
  function pruneLayersFrom(seq) {
    objectLayersRef.current = objectLayersRef.current.filter(
      (item) => (item.seq || 0) < seq
    );
    setObjectLayers([...objectLayersRef.current]);

    toolLayersRef.current = toolLayersRef.current.filter(
      (item) => (item.seq || 0) < seq
    );
    setToolLayers([...toolLayersRef.current]);
  }

  // Rebuild the "applied edits" summary from the remaining layers.
  function rebuildAppliedEdits() {
    const remaining = [...objectLayersRef.current, ...toolLayersRef.current]
      .sort((a, b) => (a.seq || 0) - (b.seq || 0))
      .map((item) => item.summary || item.name);
    setAppliedActions(remaining);
  }

  // Used by Undo/Redo.
  function restoreLayers(snap) {
    objectLayersRef.current = snap.objectLayers;
    setObjectLayers(snap.objectLayers);

    toolLayersRef.current = snap.toolLayers;
    setToolLayers(snap.toolLayers);

    setAppliedActions(snap.appliedEdits);
  }

  // Used by Reset. layerSeqRef is never reset so Undo/Redo can restore old layers.
  function clearLayers() {
    objectLayersRef.current = [];
    setObjectLayers([]);

    toolLayersRef.current = [];
    setToolLayers([]);

    setAppliedActions([]);
  }

  return {
    objectLayers,
    toolLayers,
    appliedEdits,
    objectLayersRef,
    toolLayersRef,
    appliedActionsRef,
    setAppliedActions,
    addAppliedAction,
    addToolLayer,
    addObjectLayer,
    pruneLayersFrom,
    rebuildAppliedEdits,
    restoreLayers,
    clearLayers,
  };
}
