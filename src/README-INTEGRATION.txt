FRONTEND - STRUCTURE AND INTEGRATION NOTES
================================

ImageEditor.jsx is now only a shell. It creates the basic state, calls the
hooks, and renders the UI. All editing logic lives in src/hooks.


FOLDER MAP
----------

src/components/editor/
  ImageEditor.jsx          shell: state + hooks + layout
  constants.js             CROP_PRESETS, DEFAULT_CROP_BOX, MIN_CROP_SIZE, HISTORY_LIMIT
  EditorHeader.jsx         title, Undo / Redo, close button, crop hint
  LayersButton.jsx         "Layers" button with layer count
  RndHandleStyles.jsx      CSS for the 8 resize handles
  layers/
    LayersPanel.jsx        layers popup
    EffectLayerItem.jsx    effect row (show/hide, edit, move, delete)
    ObjectLayerItem.jsx    object remove / AI object remove row (Edit)
    ToolLayerItem.jsx      crop / resize / background / apply row (Revert)
    layerStyles.js         shared class names

src/hooks/
  useEditLayers.js         object layers, tool layers, applied-edits list
  useEffectLayers.js       effect layers (toggle, move, delete, edit)
  useEditorHistory.js      undo / redo + Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z
  useCropTool.js           crop box, presets, drag/resize, apply crop
  useResizeTool.js         resize state, units, apply resize
  useObjectRemove.js       object remove + AI object remove (brush, apply, edit layer)
  useBackgroundRemove.js   background removal
  useApplyAll.js           "Apply" button (export final image)
  useRestoreToolLayer.js   Revert a tool layer
  useImageDrag.js          drag image on canvas
  useRenderPipeline.js     draws the canvas from the current image + live edits
  useLoadImage.js          loads workingFile into an image element
  useCtrlKey.js            tracks Ctrl key
  useObjectDockAnchor.js   position of the object-remove dock
  useCropWheelZoom.js      mouse wheel zoom in crop mode
  useBodyScrollLock.js     locks page scroll while the editor is open
  useWheelSlidersEffect.js enables wheel on sliders

src/utils/editorTools/
  canvasHelpers.js         clamp, canvasToBlob, mask helpers, pointer helpers
  effectHelpers.js         getEffectList / getEffectPreset / getEffectLabel
  liveEdits.js             text labels for live adjustments
  miganInpaint.js          MI-GAN (ONNX) model loading + AI inpainting


EXISTING FILES THAT MUST STAY WHERE THEY ARE
--------------------------------------------

Used by ImageEditor.jsx (same folder, src/components/editor/):
  EditorCanvas.jsx, EditorControls.jsx, EffectsPanel.jsx,
  EditCompleteOverlay.jsx, ResizeDock.jsx, CropDock.jsx,
  DraggableDock.jsx, ObjectRemoveDock.jsx

Used by the hooks (src/utils/):
  imageEditor.js           exports loadImage
  imageEditorPipeline.js   exports renderImageEdits
  editorEffects.js         exports EFFECT_PRESETS
  wheelSliders.js          exports enableWheelSliders


PACKAGES NEEDED
---------------

  react
  lucide-react
  onnxruntime-web
  @imgly/background-removal
  react-rnd                (used by EditorCanvas for the resize frame)


HOW THE PIECES TALK TO EACH OTHER
---------------------------------

- ImageEditor.jsx owns: image, workingFile, brightness, contrast, saturation,
  rotation, flip, zoom, imageOffset, activeTool and the busy flags
  (applying, removingBackground, objectApplying).
- The busy flags live in the shell so that editorControlsDisabled can be
  computed before the tool hooks run (avoids circular dependencies).
- Tool hooks receive setters and helpers as parameters, and get the shared
  `layers` object from useEditLayers.
- Every tool that creates a new image does the same steps:
    layers.addToolLayer(...) or layers.addObjectLayer(...)
    setWorkingFile(newFile); setImage(newImage);
    layers.addAppliedAction(summary)
- Undo / Redo works on snapshots taken automatically (400 ms debounce)
  whenever workingFile, adjustments or layer lists change.


BEHAVIOUR NOTES
---------------

- Background remove keeps live edits (effects, brightness, contrast,
  saturation, rotation, flip). They are re-applied by the render pipeline on
  top of the new transparent image.
- Crop, resize, object remove and AI object remove call resetLiveEdits()
  because their result already contains the edits.
- "Apply" exports the visible canvas, clears all live edits, and shows the
  complete overlay.
- Reset returns to the original `file` and clears all layers. layerSeqRef is
  never reset so Undo / Redo can restore old layers safely.


CLEANUP (optional)
------------------

- src/components/EditorHeader.jsx is a duplicate of
  src/components/editor/EditorHeader.jsx. Delete it if nothing else imports it.
- src/utils/aiObjectRemoval.js and src/utils/backgroundRemoval.js are not
  used by ImageEditor.jsx anymore. Delete them if nothing else imports them.