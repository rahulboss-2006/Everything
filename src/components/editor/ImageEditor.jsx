import { useRef, useState } from "react";

import EditCompleteOverlay from "./EditCompleteOverlay";
import EffectsPanel from "./EffectsPanel";
import EditorControls from "./EditorControls";
import EditorCanvas from "./EditorCanvas";
import ResizeDock from "./ResizeDock";
import CropDock from "./CropDock";
import DraggableDock from "./DraggableDock";
import ObjectRemoveDock from "./ObjectRemoveDock";

import EditorHeader from "./EditorHeader";
import LayersButton from "./LayersButton";
import LayersPanel from "./layers/LayersPanel";
import RndHandleStyles from "./RndHandleStyles";

import { CROP_PRESETS } from "./constants";

import useApplyAll from "../../hooks/useApplyAll";
import useBackgroundRemove from "../../hooks/useBackgroundRemove";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useCropTool from "../../hooks/useCropTool";
import useCropWheelZoom from "../../hooks/useCropWheelZoom";
import useCtrlKey from "../../hooks/useCtrlKey";
import useEditLayers from "../../hooks/useEditLayers";
import useEditorHistory from "../../hooks/useEditorHistory";
import useEffectLayers from "../../hooks/useEffectLayers";
import useImageDrag from "../../hooks/useImageDrag";
import useLoadImage from "../../hooks/useLoadImage";
import useObjectDockAnchor from "../../hooks/useObjectDockAnchor";
import useObjectRemove from "../../hooks/useObjectRemove";
import useRenderPipeline from "../../hooks/useRenderPipeline";
import useResizeTool from "../../hooks/useResizeTool";
import useRestoreToolLayer from "../../hooks/useRestoreToolLayer";
import useWheelSlidersEffect from "../../hooks/useWheelSlidersEffect";

function ImageEditor({ file, onComplete, onClose }) {
  /* ------------------------- refs ------------------------- */

  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const zoomAreaRef = useRef(null);

  /* ------------------------ state ------------------------- */

  const [image, setImage] = useState(null);
  const [workingFile, setWorkingFile] = useState(file);

  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);

  const [showLayers, setShowLayers] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [effectPreviewSrc, setEffectPreviewSrc] = useState("");

  const [applying, setApplying] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [removingBackground, setRemovingBackground] = useState(false);
  const [objectApplying, setObjectApplying] = useState(false);

  const [activeTool, setActiveTool] = useState(null);

  /* ------------------------ modes ------------------------- */

  const cropMode = activeTool === "crop";
  const objectMode = activeTool === "object" || activeTool === "ai-object";
  const aiObjectMode = activeTool === "ai-object";
  const resizeMode = activeTool === "resize";

  const editorControlsDisabled =
    cropMode ||
    objectMode ||
    resizeMode ||
    applying ||
    removingBackground ||
    objectApplying;

  /* ------------------ layers + effects -------------------- */

  const layers = useEditLayers();

  const effects = useEffectLayers({
    editorControlsDisabled,
    canvasRef,
    setShowLayers,
    setShowEffects,
    setEffectPreviewSrc,
  });

  // Live adjustments only (used right after Apply exported them).
  function clearLiveEdits() {
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setRotation(0);
    setFlipX(false);
    setFlipY(false);
    effects.clearEffects();
    setImageOffset({ x: 0, y: 0 });
  }

  function resetLiveEdits() {
    clearLiveEdits();
    setZoom(100);
  }

  /* ------------------------ tools ------------------------- */

  const isCtrlPressed = useCtrlKey();

  const imageDrag = useImageDrag({
    canvasRef,
    imageOffset,
    setImageOffset,
    disabled: editorControlsDisabled,
  });

  const resize = useResizeTool({
    canvasRef,
    previewRef,
    zoomAreaRef,
    image,
    workingFile,
    setWorkingFile,
    setImage,
    editorControlsDisabled,
    applying,
    setApplying,
    setShowEffects,
    setZoom,
    setImageOffset,
    setActiveTool,
    resetLiveEdits,
    layers,
  });

  useLoadImage(workingFile, (loaded, width, height) => {
    setImage(loaded);
    resize.setOriginalSize(width, height);
  });

  const crop = useCropTool({
    cropMode,
    objectMode,
    canvasRef,
    previewRef,
    setActiveTool,
    editorControlsDisabled,
    applying,
    setApplying,
    removingBackground,
    imageOffset,
    setImageOffset,
    setZoom,
    workingFile,
    setWorkingFile,
    setImage,
    layers,
    resetLiveEdits,
  });

  const object = useObjectRemove({
    objectMode,
    aiObjectMode,
    canvasRef,
    setActiveTool,
    workingFile,
    setWorkingFile,
    setImage,
    removingBackground,
    objectApplying,
    setObjectApplying,
    resetImageDrag: imageDrag.resetImageDrag,
    resetLiveEdits,
    setShowEffects,
    setShowLayers,
    layers,
  });

  const background = useBackgroundRemove({
    workingFile,
    removingBackground,
    setRemovingBackground,
    setWorkingFile,
    setImage,
    setImageOffset,
    setActiveTool,
    resetImageDrag: imageDrag.resetImageDrag,
    objectBaseCanvasRef: object.objectBaseCanvasRef,
    objectDrawingRef: object.objectDrawingRef,
    layers,
  });

  const { restoreToolLayer } = useRestoreToolLayer({
    editorControlsDisabled,
    layers,
    setShowLayers,
    setWorkingFile,
    setImage,
    resetLiveEdits,
  });

  const { handleApply } = useApplyAll({
    canvasRef,
    workingFile,
    setWorkingFile,
    objectMode,
    resizeMode,
    cropMode,
    applying,
    setApplying,
    liveState: {
      brightness,
      contrast,
      saturation,
      rotation,
      flipX,
      flipY,
      selectedEffects: effects.selectedEffects,
    },
    layers,
    clearLiveEdits,
    setEffectPreviewSrc,
    setShowEffects,
    setShowComplete,
  });

  /* --------------- render / history / misc ---------------- */

  useRenderPipeline({
    canvasRef,
    image,
    brightness,
    contrast,
    saturation,
    rotation,
    flipX,
    flipY,
    imageOffset,
    selectedEffects: effects.selectedEffects,
    showEffects,
    objectMode,
    objectBaseCanvasRef: object.objectBaseCanvasRef,
    setEffectPreviewSrc,
  });

  const objectDockAnchor = useObjectDockAnchor(objectMode, {
    previewRef,
    zoomAreaRef,
    canvasRef,
  });

  useCropWheelZoom(cropMode, previewRef, setZoom);
  useBodyScrollLock();
  useWheelSlidersEffect();

  const history = useEditorHistory({
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
  });

  /* ---------------------- transforms ---------------------- */

  const handleRotate = () => setRotation((current) => (current + 90) % 360);
  const handleFlipHorizontal = () => setFlipX((current) => !current);
  const handleFlipVertical = () => setFlipY((current) => !current);

  /* ------------------------ reset ------------------------- */

  function handleReset() {
    if (editorControlsDisabled) return;

    /*
      Reset the edit state first. Do NOT set image(null): clearing image
      creates a render gap and can leave child docks with a stale preview.
      Switching workingFile back to the original file reloads it if needed.
    */

    resetLiveEdits();
    crop.resetCrop();

    setActiveTool(null);
    setShowEffects(false);
    setShowComplete(false);
    setEffectPreviewSrc("");

    resize.clearResizeState();
    object.resetObjectState();
    layers.clearLayers();

    if (workingFile !== file) {
      setWorkingFile(file);
    }
  }

  /* ----------------------- complete ----------------------- */

  function handleComplete() {
    if (!workingFile) return;

    setShowComplete(false);
    onComplete?.(workingFile);
    onClose?.();
  }

  /* ----------------------- layer list --------------------- */

  // Effects first, then object + tool layers in the order they were created.
  const operationLayers = [
    ...layers.objectLayers.map((layer) => ({ ...layer, layerType: "object" })),
    ...layers.toolLayers.map((layer) => ({ ...layer, layerType: "tool" })),
  ].sort((a, b) => (a.seq || 0) - (b.seq || 0));

  const allLayers = [
    ...effects.effectLayers.map((layer) => ({ ...layer, layerType: "effect" })),
    ...operationLayers,
  ];

  /* ------------------------ render ------------------------ */

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-xl sm:p-6">
      <RndHandleStyles />

      <div className="flex h-[95dvh] max-h-[95dvh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl dark:bg-slate-950">
        <EditorHeader
          cropMode={cropMode}
          isCropHovering={crop.isCropHovering}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={history.handleUndo}
          onRedo={history.handleRedo}
          onClose={onClose}
          closeDisabled={removingBackground || applying || objectApplying}
        />

        {/* MAIN */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:block lg:overflow-auto lg:overscroll-contain">
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4 lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:p-6">
            {/* Canvas: fixed on mobile/tablet */}
            <div className="h-[42dvh] shrink-0 overflow-hidden sm:h-[50dvh] lg:sticky lg:top-10 lg:h-auto lg:self-start lg:overflow-visible [&>*]:h-full lg:[&>*]:h-auto">
              <EditorCanvas
                resizeMode={resizeMode}
                cropMode={cropMode}
                objectMode={objectMode}
                previewRef={previewRef}
                zoomAreaRef={zoomAreaRef}
                resizeStageSize={resize.resizeStageSize}
                zoom={zoom}
                canvasRef={canvasRef}
                aiObjectMode={aiObjectMode}
                aiObjectOverlayCanvasRef={object.aiObjectOverlayCanvasRef}
                handleObjectPointerDown={object.handleObjectPointerDown}
                handleObjectPointerMove={object.handleObjectPointerMove}
                handleObjectPointerUp={object.handleObjectPointerUp}
                handleImagePointerDown={imageDrag.handleImagePointerDown}
                handleImagePointerMove={imageDrag.handleImagePointerMove}
                handleImagePointerUp={imageDrag.handleImagePointerUp}
                isCtrlDragging={crop.isCtrlDragging}
                isCtrlPressed={isCtrlPressed}
                setIsCropHovering={crop.setIsCropHovering}
                resizePreviewSrc={resize.resizePreviewSrc}
                resizeFrame={resize.resizeFrame}
                resizeLockRatio={resize.resizeLockRatio}
                resizeActiveDirection={resize.resizeActiveDirection}
                resizeRndRatioRef={resize.resizeRndRatioRef}
                resizePreviewScaleRef={resize.resizePreviewScaleRef}
                setResizeActiveDirection={resize.setResizeActiveDirection}
                setResizeFrame={resize.setResizeFrame}
                setResizeWidth={resize.setResizeWidth}
                setResizeHeight={resize.setResizeHeight}
                applying={applying}
                removingBackground={removingBackground}
                backgroundProgress={background.backgroundProgress}
                backgroundPreparing={background.backgroundPreparing}
                backgroundReady={background.backgroundReady}
                backgroundRemoved={background.backgroundRemoved}
                objectApplying={objectApplying}
                aiProgress={object.aiProgress}
                aiProgressLabel={object.aiProgressLabel}
                image={image}
                handleCropPointerDown={crop.handleCropPointerDown}
                handleCropPointerMove={crop.handleCropPointerMove}
                handleCropPointerUp={crop.handleCropPointerUp}
                cropBox={crop.cropBox}
                objectBrushSize={object.objectBrushSize}
                setObjectBrushSize={object.setObjectBrushSize}
                cancelObjectRemove={object.cancelObjectRemove}
                applyObjectRemove={object.applyObjectRemove}
              />
            </div>

            {/* Controls: scrolls on mobile/tablet */}
            <div className="relative min-h-0 flex-1 lg:flex-none">
              <div className="h-full overflow-y-auto overscroll-contain pb-24 lg:h-auto lg:overflow-visible lg:pb-0">
                {/* Eta ager relative wrapper-er kaj kore, button ekhon content-er shathe scroll korbe */}
                <div className="relative">
                  <LayersButton
                    count={allLayers.length}
                    disabled={applying || removingBackground || objectApplying}
                    onClick={() => setShowLayers(true)}
                  />

                  <EditorControls
                    brightness={brightness}
                    setBrightness={setBrightness}
                    contrast={contrast}
                    setContrast={setContrast}
                    saturation={saturation}
                    setSaturation={setSaturation}
                    editorControlsDisabled={editorControlsDisabled}
                    activeTool={activeTool}
                    startCrop={crop.startCrop}
                    startResize={resize.startResize}
                    removingBackground={removingBackground}
                    backgroundPreparing={background.backgroundPreparing}
                    backgroundReady={background.backgroundReady}
                    backgroundRemoved={background.backgroundRemoved}
                    handleBackgroundRemove={background.handleBackgroundRemove}
                    handleObjectRemove={object.handleObjectRemove}
                    canvasRef={canvasRef}
                    setEffectPreviewSrc={setEffectPreviewSrc}
                    setShowEffects={setShowEffects}
                    handleAIObjectRemove={object.handleAIObjectRemove}
                    aiObjectMode={aiObjectMode}
                    objectApplying={objectApplying}
                    handleRotate={handleRotate}
                    handleFlipHorizontal={handleFlipHorizontal}
                    handleFlipVertical={handleFlipVertical}
                    handleReset={handleReset}
                    handleApply={handleApply}
                    applying={applying}
                  />
                </div>
              </div>

              {/* Outside the scroll container so an absolute panel isn't clipped */}
              {showLayers && (
                <LayersPanel
                  allLayers={allLayers}
                  effectLayers={effects.effectLayers}
                  onClose={() => setShowLayers(false)}
                  onToggleEffect={effects.handleToggleEffectLayer}
                  onEditEffect={effects.handleEditEffectLayer}
                  onMoveEffect={effects.handleMoveEffectLayer}
                  onDeleteEffect={effects.handleDeleteEffectLayer}
                  onEditObject={object.editObjectLayer}
                  onRevertTool={restoreToolLayer}
                />
              )}
            </div>
          </div>
        </div>

        {/* EFFECTS */}
        {showEffects && (
          <EffectsPanel
            imageSrc={effectPreviewSrc}
            image={image}
            selectedEffects={effects.selectedEffects}
            onSelect={effects.toggleEffect}
            onClose={() => setShowEffects(false)}
          />
        )}

        {/* COMPLETE */}
        {showComplete && (
          <EditCompleteOverlay
            edits={layers.appliedEdits}
            file={workingFile}
            onComplete={handleComplete}
          />
        )}

        <DraggableDock>
          <ResizeDock
            resizeMode={resizeMode}
            resizeWidth={resize.resizeWidth}
            resizeHeight={resize.resizeHeight}
            resizeUnit={resize.resizeUnit}
            resizeResolution={resize.resizeResolution}
            resizeResample={resize.resizeResample}
            resizeLockRatio={resize.resizeLockRatio}
            applying={applying}
            getDisplayValue={resize.getDisplayValue}
            handleResizeWidthChange={resize.handleResizeWidthChange}
            handleResizeHeightChange={resize.handleResizeHeightChange}
            handleResizeUnitChange={resize.handleResizeUnitChange}
            handleResolutionChange={resize.handleResolutionChange}
            setResizeLockRatio={resize.setResizeLockRatio}
            setResizeResample={resize.setResizeResample}
            resetResizeDimensions={resize.resetResizeDimensions}
            cancelResize={resize.cancelResize}
            applyResize={resize.applyResize}
          />
        </DraggableDock>

        <DraggableDock>
          <CropDock
            activeTool={activeTool}
            CROP_PRESETS={CROP_PRESETS}
            cropPreset={crop.cropPreset}
            handleCropPreset={crop.handleCropPreset}
            zoom={zoom}
            setZoom={setZoom}
            cancelCrop={crop.cancelCrop}
            applyCrop={crop.applyCrop}
            applying={applying}
          />
        </DraggableDock>

        <ObjectRemoveDock
          objectMode={objectMode}
          aiObjectMode={aiObjectMode}
          objectBrushSize={object.objectBrushSize}
          setObjectBrushSize={object.setObjectBrushSize}
          cancelObjectRemove={object.cancelObjectRemove}
          applyObjectRemove={object.applyObjectRemove}
          objectApplying={objectApplying}
          anchor={objectDockAnchor}
        />
      </div>
    </div>
  );
}

export default ImageEditor;