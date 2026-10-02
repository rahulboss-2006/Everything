import { Rnd } from "react-rnd";

export default function EditorCanvas({
  resizeMode,
  cropMode,
  objectMode,

  previewRef,
  zoomAreaRef,
  resizeStageSize,
  zoom,

  canvasRef,
  aiObjectMode,
  aiObjectOverlayCanvasRef,

  handleObjectPointerDown,
  handleObjectPointerMove,
  handleObjectPointerUp,

  handleImagePointerDown,
  handleImagePointerMove,
  handleImagePointerUp,

  isCtrlDragging,
  isCtrlPressed,

  setIsCropHovering,

  resizePreviewSrc,
  resizeFrame,
  resizeLockRatio,
  resizeActiveDirection,
  resizeRndRatioRef,
  resizePreviewScaleRef,

  setResizeActiveDirection,
  setResizeFrame,
  setResizeWidth,
  setResizeHeight,

  applying,

  removingBackground,
  backgroundProgress,

  objectApplying,
  aiProgress,
  aiProgressLabel,

  image,

  handleCropPointerDown,
  handleCropPointerMove,
  handleCropPointerUp,

  cropBox,
}) {
  const blockPointer = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <>
      {/* PREVIEW */}

      <div className="relative flex min-h-[300px] w-full items-center justify-center rounded-[28px] bg-[#020618]">
        <div
          className="relative flex min-h-[300px] min-w-0 items-center justify-center overscroll-contain rounded-[28px] p-3"
          style={{
            overflow: resizeMode ? "visible" : "hidden",

            backgroundImage: `
              linear-gradient(45deg, rgba(148,163,184,0.16) 25%, transparent 25%),
              linear-gradient(-45deg, rgba(148,163,184,0.16) 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.16) 75%),
              linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.16) 75%)
            `,

            backgroundSize: "24px 24px",

            backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0",
          }}
        >
          <div className="relative inline-flex max-w-full flex-col items-center justify-center">
            <div
              ref={previewRef}
              onMouseEnter={() => {
                if (cropMode) {
                  setIsCropHovering(true);
                }
              }}
              onMouseLeave={() => {
                setIsCropHovering(false);
              }}
              className="relative inline-flex max-h-[60vh] max-w-full shrink-0 items-center justify-center rounded-2xl"
              style={{
                overflow: resizeMode ? "visible" : "hidden",

                touchAction:
                  cropMode || objectMode || resizeMode ? "none" : "auto",
              }}
            >
              <div
                ref={zoomAreaRef}
                className="relative inline-block max-h-[60vh] max-w-full shrink-0"
                style={{
                  width: resizeStageSize.width
                    ? `${resizeStageSize.width}px`
                    : undefined,

                  height: resizeStageSize.height
                    ? `${resizeStageSize.height}px`
                    : undefined,

                  overflow: resizeMode ? "visible" : "hidden",

                  transform: resizeMode ? "none" : `scale(${zoom / 100})`,

                  transformOrigin: "center center",

                  willChange: "transform",

                  touchAction:
                    resizeMode || cropMode || objectMode ? "none" : "auto",
                }}
              >
                <canvas
                  ref={canvasRef}
                  onPointerDown={
                    resizeMode
                      ? blockPointer
                      : objectMode
                        ? handleObjectPointerDown
                        : handleImagePointerDown
                  }
                  onPointerMove={
                    resizeMode
                      ? blockPointer
                      : objectMode
                        ? handleObjectPointerMove
                        : handleImagePointerMove
                  }
                  onPointerUp={
                    resizeMode
                      ? blockPointer
                      : objectMode
                        ? handleObjectPointerUp
                        : handleImagePointerUp
                  }
                  onPointerCancel={
                    resizeMode
                      ? blockPointer
                      : objectMode
                        ? handleObjectPointerUp
                        : handleImagePointerUp
                  }
                  className={`block max-h-[60vh] max-w-full rounded-2xl ${
                    objectMode
                      ? "cursor-crosshair"
                      : cropMode
                        ? isCtrlDragging
                          ? "cursor-grabbing"
                          : isCtrlPressed
                            ? "cursor-grab"
                            : "cursor-default"
                        : "cursor-grab active:cursor-grabbing"
                  }`}
                  style={{
                    touchAction: "none",

                    userSelect: "none",

                    ...(resizeStageSize.width && resizeStageSize.height
                      ? {
                          width: `${resizeStageSize.width}px`,
                          height: `${resizeStageSize.height}px`,
                          maxWidth: "none",
                          maxHeight: "none",
                        }
                      : {}),

                    ...(resizeMode
                      ? {
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          maxWidth: "none",
                          maxHeight: "none",
                          opacity: 0,
                          pointerEvents: "none",
                        }
                      : {}),
                  }}
                />

                {aiObjectMode && (
                  <canvas
                    ref={aiObjectOverlayCanvasRef}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-20 block h-full w-full rounded-2xl"
                    style={{
                      width: "100%",
                      height: "100%",
                      pointerEvents: "none",
                    }}
                  />
                )}

                {/* RND RESIZE */}

                {resizeMode &&
                  resizePreviewSrc &&
                  resizeFrame.width > 0 &&
                  resizeFrame.height > 0 && (
                    <Rnd
                      bounds="parent"
                      size={{
                        width: resizeFrame.width,
                        height: resizeFrame.height,
                      }}
                      position={{
                        x: resizeFrame.left,
                        y: resizeFrame.top,
                      }}
                      minWidth={40}
                      minHeight={40}
                      maxWidth={resizeStageSize.width || undefined}
                      maxHeight={resizeStageSize.height || undefined}
                      /*
                       * Corner handles keep the existing aspect-ratio lock.
                       * The 4 middle handles resize only their own side.
                       */
                      lockAspectRatio={
                        resizeLockRatio &&
                        !["top", "right", "bottom", "left"].includes(
                          resizeActiveDirection
                        )
                          ? resizeRndRatioRef.current
                          : false
                      }
                      enableResizing={{
                        top: true,
                        right: true,
                        bottom: true,
                        left: true,
                        topRight: true,
                        bottomRight: true,
                        bottomLeft: true,
                        topLeft: true,
                      }}
                      resizeHandleClasses={{
                        top: "everything-rnd-handle everything-rnd-handle-top",
                        right:
                          "everything-rnd-handle everything-rnd-handle-right",
                        bottom:
                          "everything-rnd-handle everything-rnd-handle-bottom",
                        left: "everything-rnd-handle everything-rnd-handle-left",
                        topRight:
                          "everything-rnd-handle everything-rnd-handle-top-right",
                        bottomRight:
                          "everything-rnd-handle everything-rnd-handle-bottom-right",
                        bottomLeft:
                          "everything-rnd-handle everything-rnd-handle-bottom-left",
                        topLeft:
                          "everything-rnd-handle everything-rnd-handle-top-left",
                      }}
                      dragAxis="both"
                      disableDragging={applying}
                      onResizeStart={(event, direction) => {
                        setResizeActiveDirection(direction);
                      }}
                      onDragStop={(event, data) => {
                        setResizeFrame((current) => ({
                          ...current,
                          left: data.x,
                          top: data.y,
                        }));
                      }}
                      onResize={(event, direction, ref, delta, position) => {
                        const visualWidth = Math.max(40, ref.offsetWidth);
                        const visualHeight = Math.max(40, ref.offsetHeight);
                        const scale = Math.max(
                          0.01,
                          resizePreviewScaleRef.current
                        );

                        setResizeFrame({
                          left: position.x,
                          top: position.y,
                          width: visualWidth,
                          height: visualHeight,
                        });

                        setResizeWidth(
                          Math.max(1, Math.round(visualWidth / scale))
                        );
                        setResizeHeight(
                          Math.max(1, Math.round(visualHeight / scale))
                        );
                      }}
                      onResizeStop={(event, direction, ref, delta, position) => {
                        const visualWidth = Math.max(40, ref.offsetWidth);
                        const visualHeight = Math.max(40, ref.offsetHeight);
                        const scale = Math.max(
                          0.01,
                          resizePreviewScaleRef.current
                        );

                        setResizeFrame({
                          left: position.x,
                          top: position.y,
                          width: visualWidth,
                          height: visualHeight,
                        });

                        setResizeWidth(
                          Math.max(1, Math.round(visualWidth / scale))
                        );
                        setResizeHeight(
                          Math.max(1, Math.round(visualHeight / scale))
                        );
                      }}
                      style={{
                        position: "absolute",
                        zIndex: 25,
                        border: "2px solid rgba(139,92,246,0.95)",
                        borderRadius: "16px",
                        overflow: "visible",
                        boxSizing: "border-box",
                        boxShadow:
                          "0 0 0 1px rgba(255,255,255,0.16), 0 12px 40px rgba(0,0,0,0.25)",
                        background: "rgba(15,23,42,0.04)",
                      }}
                    >
                      <div
                        className="relative h-full w-full overflow-hidden rounded-[14px]"
                        style={{
                          userSelect: "none",
                          pointerEvents: "none",
                        }}
                      >
                        <img
                          src={resizePreviewSrc}
                          alt="Resize preview"
                          draggable={false}
                          className="block h-full w-full select-none rounded-[14px] object-fill"
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "block",
                            userSelect: "none",
                            pointerEvents: "none",
                          }}
                        />

                        <div className="pointer-events-none absolute inset-0 rounded-[14px] border border-white/25" />
                      </div>
                    </Rnd>
                  )}

                {/* BACKGROUND LOADER */}

                {removingBackground && (
                  <div className="ai-background-loader">
                    <div className="ai-thin-scan" />

                    <div className="ai-progress-content">
                      <div className="ai-progress-card">
                        <div className="ai-progress-title">
                          <span className="ai-progress-spinner" />
                          <span>Removing Background...</span>
                        </div>

                        <div className="ai-progress-percent">
                          {Math.round(backgroundProgress)}%
                        </div>

                        <div className="ai-progress-track">
                          <div
                            className="ai-progress-fill"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, backgroundProgress)
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="ai-progress-text">
                          AI is removing the background
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* AI OBJECT REMOVE LOADER */}

            
{aiObjectMode && objectApplying && (
  <div
    className="
      absolute
      inset-0
      z-50
      isolate
      overflow-hidden
      pointer-events-none

      flex
      items-center
      justify-center

      bg-slate-950/70

      backdrop-blur-[20px]
    "
  >
    {/* =====================================================
        BACKGROUND GLOW 1
    ===================================================== */}

    <div
      className="
        absolute
        left-1/2
        top-1/2

        h-[420px]
        w-[420px]

        -translate-x-1/2
        -translate-y-1/2

        rounded-full

        bg-cyan-500/10

        shadow-[0_0_120px_60px_rgba(0,200,255,.12)]
      "
    />

    {/* =====================================================
        BACKGROUND GLOW 2
    ===================================================== */}

    <div
      className="
        absolute
        left-1/2
        top-1/2

        h-[280px]
        w-[280px]

        -translate-x-1/2
        -translate-y-1/2

        rounded-full

        bg-violet-500/10

        shadow-[0_0_100px_50px_rgba(139,92,246,.12)]
      "
    />

    {/* =====================================================
        CENTER CARD
    ===================================================== */}

    <div
      className="
        relative
        z-50

        flex
        w-[280px]

        flex-col
        items-center

        rounded-2xl

        border
        border-white/10

        bg-slate-950/40

        px-6
        py-6

        shadow-[0_20px_60px_rgba(0,0,0,.55),0_0_40px_rgba(0,200,255,.08)]

        backdrop-blur-[18px]
      "
    >
      {/* =================================================
          SPINNER
      ================================================= */}

      <div
        className="
          mb-4

          relative

          h-10
          w-10
        "
      >
        <div
          className="
            absolute
            inset-0

            rounded-full

            border-2
            border-white/10
          "
        />

        <div
          className="
            absolute
            inset-0

            rounded-full

            border-2
            border-transparent

            border-t-cyan-400
            border-r-rose-400

            animate-spin
          "
        />

        <div
          className="
            absolute
            left-1/2
            top-1/2

            h-2
            w-2

            -translate-x-1/2
            -translate-y-1/2

            rounded-full

            bg-white

            shadow-[0_0_8px_white,0_0_18px_rgba(0,200,255,.9)]
          "
        />
      </div>

      {/* =================================================
          TITLE
      ================================================= */}

      <div
        className="
          mb-2

          text-center

          text-sm
          font-semibold

          text-white
        "
      >
        AI Object Removing...
      </div>

      {/* =================================================
          PERCENTAGE
      ================================================= */}

      <div
        className="
          mb-4

          text-4xl
          font-black

          leading-none

          text-white

          [text-shadow:0_0_18px_rgba(0,200,255,.45)]
        "
      >
        {Math.round(aiProgress)}%
      </div>

      {/* =================================================
          PROGRESS TRACK
      ================================================= */}

      <div
        className="
          relative

          h-2
          w-full

          overflow-visible

          rounded-full

          bg-white/10

          shadow-[inset_0_0_5px_rgba(255,255,255,.1)]
        "
      >
        {/* ===============================================
            PROGRESS FILL
        =============================================== */}

        <div
          className="
            absolute
            left-0
            top-0

            h-full

            rounded-full

            bg-gradient-to-r
            from-cyan-400
            via-violet-500
            to-rose-500

            shadow-[0_0_6px_rgba(34,211,238,.9),0_0_14px_rgba(139,92,246,.7),0_0_24px_rgba(244,63,94,.45)]

            transition-all
            duration-150
            ease-linear
          "
          style={{
            width: `${Math.min(
              100,
              Math.max(0, aiProgress)
            )}%`,
          }}
        >
          {/* =============================================
              WHITE GLOW AT PROGRESS END

              NO CSS
              NO ::after
              NO filter
          ============================================= */}

          <div
            className="
              absolute
              right-[-7px]
              top-1/2

              h-5
              w-5

              -translate-y-1/2

              rounded-full

              bg-white

              opacity-90

              shadow-[0_0_5px_white,0_0_10px_white,0_0_20px_rgba(0,200,255,.95),0_0_35px_rgba(0,200,255,.65)]
            "
          />

          {/* =============================================
              CYAN OUTER GLOW
          ============================================= */}

          <div
            className="
              absolute
              right-[-13px]
              top-1/2

              h-7
              w-7

              -translate-y-1/2

              rounded-full

              bg-cyan-400/20

              shadow-[0_0_15px_8px_rgba(34,211,238,.25)]
            "
          />
        </div>
      </div>

      {/* =================================================
          LABEL
      ================================================= */}

      <div
        className="
          mt-3

          text-[10px]

          font-medium

          tracking-wide

          text-white/50
        "
      >
        {aiProgressLabel}
      </div>
    </div>
  </div>
)}




              {/* CROP OVERLAY */}

              {cropMode && image && (
                <div
                  className={`absolute inset-0 z-20 overflow-visible ${
                    isCtrlDragging
                      ? "cursor-grabbing"
                      : isCtrlPressed
                        ? "cursor-grab"
                        : "cursor-default"
                  }`}
                  onPointerDown={handleCropPointerDown}
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={handleCropPointerUp}
                  onPointerCancel={handleCropPointerUp}
                  style={{
                    touchAction: "none",
                  }}
                >
                  <div
                    data-crop-box="true"
                    className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.48)]"
                    style={{
                      left: `${cropBox.x}%`,
                      top: `${cropBox.y}%`,
                      width: `${cropBox.width}%`,
                      height: `${cropBox.height}%`,
                      touchAction: "none",
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute left-1/3 top-0 h-full w-px bg-white/30" />
                      <div className="absolute left-2/3 top-0 h-full w-px bg-white/30" />
                      <div className="absolute left-0 top-1/3 h-px w-full bg-white/30" />
                      <div className="absolute left-0 top-2/3 h-px w-full bg-white/30" />
                    </div>

                    <div
                      data-handle="nw"
                      className="absolute -left-1.5 -top-1.5 z-30 h-3.5 w-3.5 cursor-nwse-resize rounded-sm bg-white shadow-[0_0_0_1px_rgba(0,0,0,.25)]"
                    />
                    <div
                      data-handle="ne"
                      className="absolute -right-1.5 -top-1.5 z-30 h-3.5 w-3.5 cursor-nesw-resize rounded-sm bg-white shadow-[0_0_0_1px_rgba(0,0,0,.25)]"
                    />
                    <div
                      data-handle="sw"
                      className="absolute -bottom-1.5 -left-1.5 z-30 h-3.5 w-3.5 cursor-nesw-resize rounded-sm bg-white shadow-[0_0_0_1px_rgba(0,0,0,.25)]"
                    />
                    <div
                      data-handle="se"
                      className="absolute -bottom-1.5 -right-1.5 z-30 h-3.5 w-3.5 cursor-nwse-resize rounded-sm bg-white shadow-[0_0_0_1px_rgba(0,0,0,.25)]"
                    />

                    <div
                      data-handle="n"
                      className="absolute left-1/2 -top-1 z-30 h-2 w-10 -translate-x-1/2 cursor-ns-resize rounded-full bg-white shadow"
                    />
                    <div
                      data-handle="s"
                      className="absolute bottom-[-4px] left-1/2 z-30 h-2 w-10 -translate-x-1/2 cursor-ns-resize rounded-full bg-white shadow"
                    />
                    <div
                      data-handle="w"
                      className="absolute left-[-4px] top-1/2 z-30 h-10 w-2 -translate-y-1/2 cursor-ew-resize rounded-full bg-white shadow"
                    />
                    <div
                      data-handle="e"
                      className="absolute right-[-4px] top-1/2 z-30 h-10 w-2 -translate-y-1/2 cursor-ew-resize rounded-full bg-white shadow"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
