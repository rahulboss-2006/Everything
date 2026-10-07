import {
  lazy,
  Suspense,
  useRef,
  useState,
} from "react";

import EditCompleteOverlay from "./EditCompleteOverlay";
import EditorControls from "./EditorControls";
import EditorCanvas from "./EditorCanvas";
import ResizeDock from "./ResizeDock";
import CropDock from "./CropDock";
import DraggableDock from "./DraggableDock";

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

/*
 * =========================================================
 * HEAVY EDITOR FEATURES
 *
 * These are loaded only when actually rendered.
 *
 * EffectsPanel:
 *   Loaded only after Effects is opened.
 *
 * ObjectRemoveDock:
 *   Loaded only after Object Remove is opened.
 * =========================================================
 */

const EffectsPanel = lazy(
  () => import("./EffectsPanel")
);

const ObjectRemoveDock = lazy(
  () => import("./ObjectRemoveDock")
);

function ImageEditor({
  file,
  onComplete,
  onClose,
}) {
  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const zoomAreaRef = useRef(null);

  const [image, setImage] = useState(null);
  const [workingFile, setWorkingFile] = useState(file);

  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);

  const [zoom, setZoom] = useState(100);

  const [imageOffset, setImageOffset] = useState({
    x: 0,
    y: 0,
  });

  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);

  const [showLayers, setShowLayers] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [effectPreviewSrc, setEffectPreviewSrc] =
    useState("");

  const [applying, setApplying] = useState(false);

  /*
   * ======================================================
   * COMPLETION OVERLAY STATE
   * ======================================================
   */

  const [showComplete, setShowComplete] =
    useState(false);

  const [completionEdits, setCompletionEdits] =
    useState([]);

  const [completionProcessing, setCompletionProcessing] =
    useState(false);

  const completionFileRef = useRef(null);

  const [removingBackground, setRemovingBackground] =
    useState(false);

  const [objectApplying, setObjectApplying] =
    useState(false);

  const [activeTool, setActiveTool] =
    useState(null);

  /*
   * ======================================================
   * TOOL ACTIVATION
   * ======================================================
   */

  const activateTool = (tool) => {
    setActiveTool(null);

    requestAnimationFrame(() => {
      setActiveTool(tool);
    });
  };

  const cropMode =
    activeTool === "crop";

  const objectMode =
    activeTool === "object" ||
    activeTool === "ai-object";

  const aiObjectMode =
    activeTool === "ai-object";

  const resizeMode =
    activeTool === "resize";

  const editorControlsDisabled =
    cropMode ||
    objectMode ||
    resizeMode ||
    applying ||
    removingBackground ||
    objectApplying;

  /*
   * ======================================================
   * LAYERS
   * ======================================================
   */

  const layers = useEditLayers();

  /*
   * ======================================================
   * COMPLETION OVERLAY OPENER
   * ======================================================
   */

  function openCompletionOverlay(
    sourceEdits = [],
    nextWorkingFile = null,
    processing = false
  ) {
    const safeEdits =
      Array.isArray(sourceEdits)
        ? Array.from(
            new Set(
              sourceEdits
                .filter(Boolean)
                .map((edit) => String(edit).trim())
                .filter(Boolean)
            )
          )
        : [];

    if (nextWorkingFile) {
      completionFileRef.current =
        nextWorkingFile;
    }

    setCompletionEdits(safeEdits);
    setCompletionProcessing(Boolean(processing));
    setShowComplete(true);
  }

  /*
   * ======================================================
   * EFFECTS
   * ======================================================
   */

  const effects = useEffectLayers({
    editorControlsDisabled,
    canvasRef,
    setShowLayers,
    setShowEffects,
    setEffectPreviewSrc,
  });

  /*
   * ======================================================
   * LIVE EDIT RESET
   * ======================================================
   */

  function clearLiveEdits() {
    setBrightness(0);
    setContrast(0);
    setSaturation(0);

    setRotation(0);

    setFlipX(false);
    setFlipY(false);

    effects.clearEffects();

    setImageOffset({
      x: 0,
      y: 0,
    });
  }

  function resetLiveEdits() {
    clearLiveEdits();
    setZoom(100);
  }

  /*
   * ======================================================
   * CTRL KEY
   * ======================================================
   */

  const isCtrlPressed = useCtrlKey();

  /*
   * ======================================================
   * IMAGE DRAG
   * ======================================================
   */

  const imageDrag = useImageDrag({
    canvasRef,
    imageOffset,
    setImageOffset,
    disabled: editorControlsDisabled,
  });

  /*
   * ======================================================
   * RESIZE
   * ======================================================
   */

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

    setActiveTool: activateTool,

    resetLiveEdits,

    layers,
  });

  /*
   * ======================================================
   * LOAD IMAGE
   * ======================================================
   */

  useLoadImage(
    workingFile,
    (loaded, width, height) => {
      setImage(loaded);

      resize.setOriginalSize(
        width,
        height
      );
    }
  );

  /*
   * ======================================================
   * CROP
   * ======================================================
   */

  const crop = useCropTool({
    cropMode,
    objectMode,

    canvasRef,
    previewRef,

    setActiveTool: activateTool,

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

  /*
   * ======================================================
   * OBJECT REMOVE
   *
   * The hook itself remains normal.
   * Its heavy MI-GAN dependency is dynamically loaded
   * inside useObjectRemove.js only when AI removal is used.
   * ======================================================
   */

  const object = useObjectRemove({
    objectMode,
    aiObjectMode,

    canvasRef,

    setActiveTool: activateTool,

    workingFile,
    setWorkingFile,
    setImage,

    removingBackground,
    objectApplying,
    setObjectApplying,

    resetImageDrag:
      imageDrag.resetImageDrag,

    resetLiveEdits,

    setShowEffects,
    setShowLayers,

    layers,
  });

  /*
   * ======================================================
   * BACKGROUND REMOVE
   * ======================================================
   */

  const background =
    useBackgroundRemove({
      workingFile,

      removingBackground,
      setRemovingBackground,

      setWorkingFile,
      setImage,

      setImageOffset,

      setActiveTool: activateTool,

      resetImageDrag:
        imageDrag.resetImageDrag,

      objectBaseCanvasRef:
        object.objectBaseCanvasRef,

      objectDrawingRef:
        object.objectDrawingRef,

      layers,

      setShowComplete:
        openCompletionOverlay,
    });

  /*
   * ======================================================
   * RESTORE TOOL LAYER
   * ======================================================
   */

  const {
    restoreToolLayer,
  } = useRestoreToolLayer({
    editorControlsDisabled,

    layers,

    setShowLayers,

    setWorkingFile,
    setImage,

    resetLiveEdits,
  });

  /*
   * ======================================================
   * APPLY ALL
   * ======================================================
   */

  const {
  handleApply,
} = useApplyAll({
  canvasRef,

  image,

  workingFile,
  setWorkingFile,

  brightness,
  contrast,
  saturation,

  rotation,

  flipX,
  flipY,

  imageOffset,

  selectedEffects:
    effects.selectedEffects,

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

    selectedEffects:
      effects.selectedEffects,
  },

  layers,

  effects,

  clearLiveEdits,

  setEffectPreviewSrc,
  setShowEffects,

  setShowComplete:
    openCompletionOverlay,
});

  /*
   * ======================================================
   * RENDER PIPELINE
   * ======================================================
   */

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

    selectedEffects:
      effects.selectedEffects,

    showEffects,

    objectMode,

    objectBaseCanvasRef:
      object.objectBaseCanvasRef,

    setEffectPreviewSrc,
  });

  /*
   * ======================================================
   * OBJECT DOCK ANCHOR
   * ======================================================
   */

  const objectDockAnchor =
    useObjectDockAnchor(
      objectMode,
      {
        previewRef,
        zoomAreaRef,
        canvasRef,
      }
    );

  /*
   * ======================================================
   * CROP ZOOM
   * ======================================================
   */

  useCropWheelZoom(
    cropMode,
    previewRef,
    setZoom
  );

  useBodyScrollLock();

  useWheelSlidersEffect();

  /*
   * ======================================================
   * HISTORY
   * ======================================================
   */

  const history =
    useEditorHistory({
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

  /*
   * ======================================================
   * ROTATE / FLIP
   * ======================================================
   */

  const handleRotate = () => {
    setRotation(
      (current) =>
        (current + 90) % 360
    );
  };

  const handleFlipHorizontal = () => {
    setFlipX(
      (current) => !current
    );
  };

  const handleFlipVertical = () => {
    setFlipY(
      (current) => !current
    );
  };

  /*
   * ======================================================
   * RESET
   * ======================================================
   */

  function handleReset() {
    if (editorControlsDisabled) {
      return;
    }

    resetLiveEdits();

    effects.clearEffectHistory();

    crop.resetCrop();

    setActiveTool(null);

    setShowEffects(false);

    setShowComplete(false);

    setCompletionEdits([]);
    setCompletionProcessing(false);

    completionFileRef.current = null;

    setEffectPreviewSrc("");

    resize.clearResizeState();

    object.resetObjectState();

    layers.clearLayers();

    if (workingFile !== file) {
      setWorkingFile(file);
    }
  }

  /*
   * ======================================================
   * COMPLETE
   * ======================================================
   */

  function handleComplete() {
    const finalFile =
      completionFileRef.current ||
      workingFile;

    if (!finalFile) {
      return;
    }

    console.log(
      "[COMPLETION] Overlay finished"
    );

    console.log(
      "[COMPLETION] Updating main image:",
      finalFile
    );

    setWorkingFile(finalFile);

    setShowComplete(false);

    setCompletionEdits([]);
    setCompletionProcessing(false);

    completionFileRef.current = null;

    onComplete?.(finalFile);

    onClose?.();
  }

  /*
   * ======================================================
   * OPERATION LAYERS
   * ======================================================
   */

  const operationLayers = [
    ...layers.objectLayers.map(
      (layer) => ({
        ...layer,
        layerType: "object",
      })
    ),

    ...layers.toolLayers.map(
      (layer) => ({
        ...layer,
        layerType: "tool",
      })
    ),
  ].sort(
    (a, b) =>
      (a.seq || 0) -
      (b.seq || 0)
  );

  /*
   * ======================================================
   * ALL LAYERS
   * ======================================================
   */

  const allLayers = [
    ...effects.effectLayers.map(
      (layer) => ({
        ...layer,
        layerType: "effect",
      })
    ),

    ...operationLayers,
  ];

  /*
   * ======================================================
   * RENDER
   * ======================================================
   */

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-xl sm:p-6">
      <RndHandleStyles />

      <div className="flex h-[95dvh] max-h-[95dvh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl dark:bg-slate-950">

        {/* HEADER */}

        <EditorHeader
          cropMode={cropMode}
          isCropHovering={
            crop.isCropHovering
          }

          canUndo={history.canUndo}
          canRedo={history.canRedo}

          onUndo={history.handleUndo}
          onRedo={history.handleRedo}

          onClose={onClose}

          closeDisabled={
            removingBackground ||
            applying ||
            objectApplying
          }
        />

        {/* MAIN EDITOR */}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:block lg:overflow-auto lg:overscroll-contain">

          <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4 lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:p-6">

            {/* CANVAS */}

            <div className="h-[42dvh] shrink-0 overflow-hidden sm:h-[50dvh] lg:sticky lg:top-10 lg:h-auto lg:self-start lg:overflow-visible [&>*]:h-full lg:[&>*]:h-auto">

              <EditorCanvas
                resizeMode={resizeMode}
                cropMode={cropMode}
                objectMode={objectMode}

                previewRef={previewRef}
                zoomAreaRef={zoomAreaRef}

                resizeStageSize={
                  resize.resizeStageSize
                }

                zoom={zoom}

                canvasRef={canvasRef}

                aiObjectMode={aiObjectMode}

                aiObjectOverlayCanvasRef={
                  object.aiObjectOverlayCanvasRef
                }

                handleObjectPointerDown={
                  object.handleObjectPointerDown
                }

                handleObjectPointerMove={
                  object.handleObjectPointerMove
                }

                handleObjectPointerUp={
                  object.handleObjectPointerUp
                }

                handleImagePointerDown={
                  imageDrag.handleImagePointerDown
                }

                handleImagePointerMove={
                  imageDrag.handleImagePointerMove
                }

                handleImagePointerUp={
                  imageDrag.handleImagePointerUp
                }

                isCtrlDragging={
                  crop.isCtrlDragging
                }

                isCtrlPressed={
                  isCtrlPressed
                }

                setIsCropHovering={
                  crop.setIsCropHovering
                }

                resizePreviewSrc={
                  resize.resizePreviewSrc
                }

                resizeFrame={
                  resize.resizeFrame
                }

                resizeLockRatio={
                  resize.resizeLockRatio
                }

                resizeActiveDirection={
                  resize.resizeActiveDirection
                }

                resizeRndRatioRef={
                  resize.resizeRndRatioRef
                }

                resizePreviewScaleRef={
                  resize.resizePreviewScaleRef
                }

                setResizeActiveDirection={
                  resize.setResizeActiveDirection
                }

                setResizeFrame={
                  resize.setResizeFrame
                }

                setResizeWidth={
                  resize.setResizeWidth
                }

                setResizeHeight={
                  resize.setResizeHeight
                }

                applying={applying}

                removingBackground={
                  removingBackground
                }

                backgroundProgress={
                  background.backgroundProgress
                }

                backgroundPreparing={
                  background.backgroundPreparing
                }

                backgroundReady={
                  background.backgroundReady
                }

                backgroundRemoved={
                  background.backgroundRemoved
                }

                objectApplying={
                  objectApplying
                }

                aiProgress={
                  object.aiProgress
                }

                aiProgressLabel={
                  object.aiProgressLabel
                }

                image={image}

                handleCropPointerDown={
                  crop.handleCropPointerDown
                }

                handleCropPointerMove={
                  crop.handleCropPointerMove
                }

                handleCropPointerUp={
                  crop.handleCropPointerUp
                }

                cropBox={crop.cropBox}

                objectBrushSize={
                  object.objectBrushSize
                }

                setObjectBrushSize={
                  object.setObjectBrushSize
                }

                cancelObjectRemove={
                  object.cancelObjectRemove
                }

                applyObjectRemove={
                  object.applyObjectRemove
                }
              />
            </div>

            {/* CONTROLS */}

            <div className="relative min-h-0 flex-1 lg:flex-none">

              <div className="h-full overflow-y-auto overscroll-contain pb-24 lg:h-auto lg:overflow-visible lg:pb-0">

                <div className="relative">

                  <LayersButton
                    count={allLayers.length}
                    disabled={
                      applying ||
                      removingBackground ||
                      objectApplying
                    }
                    onClick={() =>
                      setShowLayers(true)
                    }
                  />

                  <EditorControls
                    brightness={brightness}
                    setBrightness={
                      setBrightness
                    }

                    contrast={contrast}
                    setContrast={
                      setContrast
                    }

                    saturation={saturation}
                    setSaturation={
                      setSaturation
                    }

                    editorControlsDisabled={
                      editorControlsDisabled
                    }

                    activeTool={activeTool}

                    startCrop={
                      crop.startCrop
                    }

                    startResize={
                      resize.startResize
                    }

                    removingBackground={
                      removingBackground
                    }

                    backgroundPreparing={
                      background.backgroundPreparing
                    }

                    backgroundReady={
                      background.backgroundReady
                    }

                    backgroundRemoved={
                      background.backgroundRemoved
                    }

                    handleBackgroundRemove={
                      background.handleBackgroundRemove
                    }

                    handleObjectRemove={
                      object.handleObjectRemove
                    }

                    canvasRef={canvasRef}

                    setEffectPreviewSrc={
                      setEffectPreviewSrc
                    }

                    setShowEffects={
                      setShowEffects
                    }

                    handleAIObjectRemove={
                      object.handleAIObjectRemove
                    }

                    aiObjectMode={
                      aiObjectMode
                    }

                    aiObjectRemoved={
                      object.aiObjectRemoved
                    }

                    objectApplying={
                      objectApplying
                    }

                    handleRotate={
                      handleRotate
                    }

                    handleFlipHorizontal={
                      handleFlipHorizontal
                    }

                    handleFlipVertical={
                      handleFlipVertical
                    }

                    handleReset={
                      handleReset
                    }

                    handleApply={
                      handleApply
                    }

                    applying={applying}
                  />
                </div>
              </div>

              {/* LAYERS PANEL */}

              {showLayers && (
                <LayersPanel
                  allLayers={allLayers}
                  effectLayers={
                    effects.effectLayers
                  }

                  onClose={() =>
                    setShowLayers(false)
                  }

                  onToggleEffect={
                    effects.handleToggleEffectLayer
                  }

                  onEditEffect={
                    effects.handleEditEffectLayer
                  }

                  onMoveEffect={
                    effects.handleMoveEffectLayer
                  }

                  onDeleteEffect={
                    effects.handleDeleteEffectLayer
                  }

                  onEditObject={
                    object.editObjectLayer
                  }

                  onRevertTool={
                    restoreToolLayer
                  }
                />
              )}
            </div>
          </div>
        </div>

        {/* EFFECTS PANEL */}

        {showEffects && (
          <Suspense fallback={null}>
            <EffectsPanel
              imageSrc={effectPreviewSrc}
              image={image}

              selectedEffects={
                effects.selectedEffects
              }

              onSelect={
                effects.toggleEffect
              }

              onClose={() =>
                setShowEffects(false)
              }
            />
          </Suspense>
        )}

        {/* COMPLETION OVERLAY */}

        {showComplete && (
          <EditCompleteOverlay
            edits={completionEdits}
            file={workingFile}
            onComplete={handleComplete}
            processing={completionProcessing}
          />
        )}

        {/* RESIZE DOCK */}

        {resizeMode && (
          <DraggableDock>
            <ResizeDock
              resizeMode={resizeMode}

              resizeWidth={
                resize.resizeWidth
              }

              resizeHeight={
                resize.resizeHeight
              }

              resizeUnit={
                resize.resizeUnit
              }

              resizeResolution={
                resize.resizeResolution
              }

              resizeResample={
                resize.resizeResample
              }

              resizeLockRatio={
                resize.resizeLockRatio
              }

              applying={applying}

              getDisplayValue={
                resize.getDisplayValue
              }

              handleResizeWidthChange={
                resize.handleResizeWidthChange
              }

              handleResizeHeightChange={
                resize.handleResizeHeightChange
              }

              handleResizeUnitChange={
                resize.handleResizeUnitChange
              }

              handleResolutionChange={
                resize.handleResolutionChange
              }

              setResizeLockRatio={
                resize.setResizeLockRatio
              }

              setResizeResample={
                resize.setResizeResample
              }

              resetResizeDimensions={
                resize.resetResizeDimensions
              }

              cancelResize={
                resize.cancelResize
              }

              applyResize={
                resize.applyResize
              }
            />
          </DraggableDock>
        )}

        {/* CROP DOCK */}

        {cropMode && (
          <DraggableDock>
            <CropDock
              activeTool={activeTool}

              CROP_PRESETS={CROP_PRESETS}

              cropPreset={crop.cropPreset}

              handleCropPreset={
                crop.handleCropPreset
              }

              zoom={zoom}
              setZoom={setZoom}

              cancelCrop={
                crop.cancelCrop
              }

              applyCrop={
                crop.applyCrop
              }

              applying={applying}
            />
          </DraggableDock>
        )}

        {/* OBJECT REMOVE DOCK */}

        {objectMode && (
          <Suspense fallback={null}>
            <ObjectRemoveDock
              objectMode={objectMode}
              aiObjectMode={aiObjectMode}

              objectBrushSize={
                object.objectBrushSize
              }

              setObjectBrushSize={
                object.setObjectBrushSize
              }

              cancelObjectRemove={
                object.cancelObjectRemove
              }

              applyObjectRemove={
                object.applyObjectRemove
              }

              objectApplying={
                objectApplying
              }

              anchor={objectDockAnchor}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default ImageEditor;