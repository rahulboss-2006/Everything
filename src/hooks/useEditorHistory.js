import { useEffect, useRef, useState } from "react";
import { loadImage } from "../utils/imageEditor";
import { HISTORY_LIMIT } from "../components/editor/constants";

/*
  GLOBAL UNDO / REDO

  A snapshot is committed (debounced) whenever the working
  file, live adjustments, or any layer list changes.

  Undo / Redo restores a complete snapshot.
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

  effects,
  layers,

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

  const [historyInfo, setHistoryInfo] = useState({
    index: -1,
    length: 0,
  });

  const { effectLayers } = effects;
  const {
    objectLayers,
    toolLayers,
    appliedEdits,
  } = layers;

  /*
   * Always keep the latest working file available
   * to async undo/redo operations.
   */
  workingFileRef.current = workingFile;

  /*
   * Give every File object a stable ID for the lifetime
   * of this editor session.
   */
  function getFileId(target) {
    if (!target) {
      return 0;
    }

    let id = fileIdsRef.current.get(target);

    if (!id) {
      id = ++fileIdSeqRef.current;
      fileIdsRef.current.set(target, id);
    }

    return id;
  }

  /*
   * Build a lightweight key representing the current
   * editable state.
   *
   * Do not include full File contents here.
   */
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
        .map(
          (layer) =>
            `${layer.id}:${layer.effectId}:${layer.visible !== false}`
        )
        .join(","),

      objectLayers
        .map((layer) => layer.id)
        .join(","),

      toolLayers
        .map((layer) => layer.id)
        .join(","),
    ].join("|");
  }

  /*
   * Create a complete history snapshot.
   *
   * Layer arrays are copied so later mutations do not
   * directly mutate the stored history array.
   */
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

  /*
   * Cancel any pending history commit.
   */
  function clearHistoryTimer() {
    if (historyTimerRef.current !== null) {
      clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }
  }

  /*
   * Commit the current state to history.
   */
  function commitHistorySnapshot(key) {
    /*
     * Never commit while undo/redo is restoring a snapshot.
     */
    if (historyBusyRef.current) {
      return;
    }

    const stack = historyRef.current.slice(
      0,
      historyIndexRef.current + 1
    );

    stack.push(
      buildHistorySnapshot(key)
    );

    const trimmed =
      stack.length > HISTORY_LIMIT
        ? stack.slice(
            stack.length - HISTORY_LIMIT
          )
        : stack;

    historyRef.current = trimmed;

    historyIndexRef.current =
      trimmed.length - 1;

    historyKeyRef.current = key;

    setHistoryInfo({
      index: historyIndexRef.current,
      length: trimmed.length,
    });

    historyTimerRef.current = null;
  }

  /*
   * Create history snapshots whenever the editable
   * state changes.
   *
   * Changes are debounced so slider dragging and similar
   * rapid updates do not create hundreds of snapshots.
   */
  useEffect(() => {
    if (!image || historyBusyRef.current) {
      return undefined;
    }

    const key = buildHistoryKey();

    /*
     * Nothing actually changed.
     */
    if (key === historyKeyRef.current) {
      return undefined;
    }

    clearHistoryTimer();

    /*
     * First state should be committed immediately.
     */
    if (historyRef.current.length === 0) {
      commitHistorySnapshot(key);
      return undefined;
    }

    /*
     * Subsequent changes are debounced.
     */
    historyTimerRef.current = setTimeout(() => {
      commitHistorySnapshot(key);
    }, 400);

    return () => {
      clearHistoryTimer();
    };

    // These objects intentionally act as change signals.
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

  /*
   * Cleanup timer when the editor/history hook unmounts.
   */
  useEffect(() => {
    return () => {
      clearHistoryTimer();
    };
  }, []);

  /*
   * Restore a history snapshot.
   */
  async function goToHistory(targetIndex) {
    if (
      historyBusyRef.current ||
      editorControlsDisabled
    ) {
      return;
    }

    const snap =
      historyRef.current[targetIndex];

    if (!snap) {
      return;
    }

    historyBusyRef.current = true;

    clearHistoryTimer();

    try {
      /*
       * Restore the image/file first when the snapshot
       * points to a different File object.
       */
      if (
        snap.workingFile !==
        workingFileRef.current
      ) {
        const loaded =
          await loadImage(
            snap.workingFile
          );

        if (!loaded) {
          throw new Error(
            "Could not restore this step."
          );
        }

        setImage(loaded);
        setWorkingFile(
          snap.workingFile
        );

        workingFileRef.current =
          snap.workingFile;
      }

      /*
       * Restore adjustments.
       */
      setBrightness(
        snap.brightness
      );

      setContrast(
        snap.contrast
      );

      setSaturation(
        snap.saturation
      );

      setRotation(
        snap.rotation
      );

      setFlipX(
        snap.flipX
      );

      setFlipY(
        snap.flipY
      );

      /*
       * Restore effect and editor layers.
       */
      effects.restoreEffectLayers(
        snap.effectLayers
      );

      layers.restoreLayers(
        snap
      );

      /*
       * Reset viewport state after changing history.
       */
      setImageOffset({
        x: 0,
        y: 0,
      });

      setZoom(100);

      setShowEffects(false);

      setEffectPreviewSrc("");

      /*
       * Move the history pointer to the restored snapshot.
       */
      historyIndexRef.current =
        targetIndex;

      historyKeyRef.current =
        snap.key;

      setHistoryInfo({
        index: targetIndex,
        length:
          historyRef.current.length,
      });
    } catch (error) {
      console.error(
        "Undo/Redo failed:",
        error
      );

      alert(
        error?.message ||
          "Could not restore this step."
      );
    } finally {
      historyBusyRef.current = false;
    }
  }

  /*
   * True when the user has made a change that has not
   * been committed to history yet.
   */
  function hasPendingHistoryChange() {
    if (
      historyRef.current.length === 0
    ) {
      return false;
    }

    return (
      buildHistoryKey() !==
      historyKeyRef.current
    );
  }

  /*
   * Undo.
   *
   * If there is a pending/debounced edit, first undo
   * that edit by restoring the current committed snapshot.
   *
   * Otherwise move one snapshot backward.
   */
  function handleUndo() {
    if (
      historyBusyRef.current ||
      editorControlsDisabled ||
      showComplete
    ) {
      return;
    }

    const current =
      historyIndexRef.current;

    if (hasPendingHistoryChange()) {
      goToHistory(current);
      return;
    }

    if (current > 0) {
      goToHistory(
        current - 1
      );
    }
  }

  /*
   * Redo.
   */
  function handleRedo() {
    if (
      historyBusyRef.current ||
      editorControlsDisabled ||
      showComplete
    ) {
      return;
    }

    /*
     * Do not redo while an uncommitted change exists.
     */
    if (
      hasPendingHistoryChange()
    ) {
      return;
    }

    const next =
      historyIndexRef.current + 1;

    if (
      next <
      historyRef.current.length
    ) {
      goToHistory(next);
    }
  }

  /*
   * Keep keyboard shortcuts pointing at the latest
   * undo/redo functions without re-registering the
   * window listener every render.
   */
  undoRef.current = handleUndo;
  redoRef.current = handleRedo;

  /*
   * Button state.
   */
  const canUndo =
    !editorControlsDisabled &&
    !showComplete &&
    !historyBusyRef.current &&
    historyInfo.index > 0;

  const canRedo =
    !editorControlsDisabled &&
    !showComplete &&
    !historyBusyRef.current &&
    historyInfo.index >= 0 &&
    historyInfo.index <
      historyInfo.length - 1;

  /*
   * Keyboard shortcuts:
   *
   * Ctrl + Z
   * Ctrl + Y
   * Ctrl + Shift + Z
   *
   * Also supports Cmd on macOS.
   */
  useEffect(() => {
    function handleHistoryKey(event) {
      if (
        !event.ctrlKey &&
        !event.metaKey
      ) {
        return;
      }

      const target =
        event.target;

      const tag =
        target?.tagName;

      const type =
        target?.type;

      /*
       * Do not hijack browser/editor shortcuts
       * while the user is typing.
       */
      const isTextField =
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable ||
        (tag === "INPUT" &&
          ![
            "range",
            "checkbox",
            "radio",
            "button",
          ].includes(type));

      if (isTextField) {
        return;
      }

      const key =
        event.key.toLowerCase();

      /*
       * Undo:
       * Ctrl+Z / Cmd+Z
       */
      if (
        key === "z" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        undoRef.current();
        return;
      }

      /*
       * Redo:
       * Ctrl+Y / Cmd+Y
       * Ctrl+Shift+Z / Cmd+Shift+Z
       */
      if (
        key === "y" ||
        (key === "z" &&
          event.shiftKey)
      ) {
        event.preventDefault();
        redoRef.current();
      }
    }

    window.addEventListener(
      "keydown",
      handleHistoryKey
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleHistoryKey
      );
    };
  }, []);

  return {
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
  };
}