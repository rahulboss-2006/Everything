import { useEffect, useRef, useState } from "react";
import { loadImage } from "../utils/imageEditor";
import { HISTORY_LIMIT } from "../components/editor/constants";

/*
  GLOBAL UNDO / REDO

  A snapshot is committed (debounced) whenever the working
  file, the live adjustments, or any layer list changes.
  Undo/Redo simply restore a snapshot.
*/
export default function useEditorHistory({
  image,
  workingFile,
  setImage,
  setWorkingFile,

  brightness,
  contrast,
  saturation,
  rotation,
  flipX,
  flipY,
  setBrightness,
  setContrast,
  setSaturation,
  setRotation,
  setFlipX,
  setFlipY,

  effects, // from useEffectLayers
  layers, // from useEditLayers

  setImageOffset,
  setZoom,
  setShowEffects,
  setEffectPreviewSrc,

  editorControlsDisabled,
  showComplete,
}) {
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const historyKeyRef = useRef("");
  const historyTimerRef = useRef(null);
  const historyBusyRef = useRef(false);
  const fileIdsRef = useRef(new WeakMap());
  const fileIdSeqRef = useRef(0);
  const workingFileRef = useRef(workingFile);
  const undoRef = useRef(() => {});
  const redoRef = useRef(() => {});

  const [historyInfo, setHistoryInfo] = useState({ index: -1, length: 0 });

  const { effectLayers } = effects;
  const { objectLayers, toolLayers, appliedEdits } = layers;

  workingFileRef.current = workingFile;

  function getFileId(target) {
    if (!target) return 0;
    let id = fileIdsRef.current.get(target);
    if (!id) {
      id = ++fileIdSeqRef.current;
      fileIdsRef.current.set(target, id);
    }
    return id;
  }

  function buildHistoryKey() {
    return [
      getFileId(workingFile),
      brightness,
      contrast,
      saturation,
      rotation,
      flipX,
      flipY,
      effectLayers
        .map((l) => `${l.id}:${l.effectId}:${l.visible !== false}`)
        .join(","),
      objectLayers.map((l) => l.id).join(","),
      toolLayers.map((l) => l.id).join(","),
    ].join("|");
  }

  function buildHistorySnapshot(key) {
    return {
      key,
      workingFile,
      brightness,
      contrast,
      saturation,
      rotation,
      flipX,
      flipY,
      effectLayers: [...effectLayers],
      objectLayers: [...objectLayers],
      toolLayers: [...toolLayers],
      appliedEdits: [...appliedEdits],
    };
  }

  useEffect(() => {
    if (!image || historyBusyRef.current) return undefined;

    const key = buildHistoryKey();
    if (key === historyKeyRef.current) return undefined;

    const commit = () => {
      const stack = historyRef.current.slice(0, historyIndexRef.current + 1);
      stack.push(buildHistorySnapshot(key));

      const trimmed =
        stack.length > HISTORY_LIMIT
          ? stack.slice(stack.length - HISTORY_LIMIT)
          : stack;

      historyRef.current = trimmed;
      historyIndexRef.current = trimmed.length - 1;
      historyKeyRef.current = key;

      setHistoryInfo({
        index: historyIndexRef.current,
        length: trimmed.length,
      });
    };

    if (historyRef.current.length === 0) {
      commit();
      return undefined;
    }

    historyTimerRef.current = setTimeout(commit, 400);

    return () => clearTimeout(historyTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    image,
    workingFile,
    brightness,
    contrast,
    saturation,
    rotation,
    flipX,
    flipY,
    effectLayers,
    objectLayers,
    toolLayers,
  ]);

  async function goToHistory(targetIndex) {
    if (historyBusyRef.current || editorControlsDisabled) return;

    const snap = historyRef.current[targetIndex];
    if (!snap) return;

    historyBusyRef.current = true;
    clearTimeout(historyTimerRef.current);

    try {
      if (snap.workingFile !== workingFileRef.current) {
        const loaded = await loadImage(snap.workingFile);
        if (!loaded) throw new Error("Could not restore this step.");

        setImage(loaded);
        setWorkingFile(snap.workingFile);
        workingFileRef.current = snap.workingFile;
      }

      setBrightness(snap.brightness);
      setContrast(snap.contrast);
      setSaturation(snap.saturation);
      setRotation(snap.rotation);
      setFlipX(snap.flipX);
      setFlipY(snap.flipY);

      effects.restoreEffectLayers(snap.effectLayers);
      layers.restoreLayers(snap);

      setImageOffset({ x: 0, y: 0 });
      setZoom(100);
      setShowEffects(false);
      setEffectPreviewSrc("");

      historyIndexRef.current = targetIndex;
      historyKeyRef.current = snap.key;

      setHistoryInfo({
        index: targetIndex,
        length: historyRef.current.length,
      });
    } catch (error) {
      console.error("Undo/Redo failed:", error);
      alert(error?.message || "Could not restore this step.");
    } finally {
      historyBusyRef.current = false;
    }
  }

  // True when there is a change that was not committed to history yet.
  function hasPendingHistoryChange() {
    return (
      historyRef.current.length > 0 &&
      buildHistoryKey() !== historyKeyRef.current
    );
  }

  function handleUndo() {
    const current = historyIndexRef.current;

    // Pending edit: Undo just discards it (back to the last committed step).
    if (hasPendingHistoryChange()) {
      goToHistory(current);
      return;
    }

    if (current > 0) goToHistory(current - 1);
  }

  function handleRedo() {
    if (hasPendingHistoryChange()) return;

    const next = historyIndexRef.current + 1;
    if (next < historyRef.current.length) goToHistory(next);
  }

  undoRef.current = handleUndo;
  redoRef.current = handleRedo;

  const canUndo =
    !editorControlsDisabled && !showComplete && historyInfo.index > 0;

  const canRedo =
    !editorControlsDisabled &&
    !showComplete &&
    historyInfo.index >= 0 &&
    historyInfo.index < historyInfo.length - 1;

  // Keyboard shortcuts: Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z
  useEffect(() => {
    function handleHistoryKey(event) {
      if (!(event.ctrlKey || event.metaKey)) return;

      const target = event.target;
      const tag = target?.tagName;
      const type = target?.type;

      const isTextField =
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable ||
        (tag === "INPUT" &&
          !["range", "checkbox", "radio", "button"].includes(type));

      if (isTextField) return;

      const key = event.key.toLowerCase();

      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undoRef.current();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redoRef.current();
      }
    }

    window.addEventListener("keydown", handleHistoryKey);

    return () => window.removeEventListener("keydown", handleHistoryKey);
  }, []);

  return { handleUndo, handleRedo, canUndo, canRedo };
}
