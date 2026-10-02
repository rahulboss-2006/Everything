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
      absolute inset-0 z-50
      overflow-hidden
      pointer-events-none
      isolate

      bg-gradient-to-br
      from-slate-950/80
      via-slate-900/60
      to-slate-950/80

      backdrop-blur-[28px]
      backdrop-saturate-[125%]
    "
                >

                  {/* Diagonal AI Scan */}
                  <div
                    className="
        absolute -inset-[80%]

        bg-[repeating-linear-gradient(
          135deg,
          transparent_0px,
          transparent_42px,
          rgba(255,30,80,0)_43px,
          rgba(255,30,80,.16)_45px,
          rgba(255,30,80,0)_48px,
          transparent_92px,
          rgba(0,180,255,0)_94px,
          rgba(0,180,255,.14)_97px,
          rgba(0,180,255,0)_100px
        )]

        animate-[aiDiagonalScan_2.2s_linear_infinite]

        mix-blend-screen
      "
                  />

                  {/* White Light Sweep */}
                  <div
                    className="
        absolute

        left-[-45%]
        top-[-40%]

        h-[180%]
        w-[24%]

        rotate-[38deg]

        bg-[linear-gradient(
          90deg,
          transparent_0%,
          rgba(255,255,255,.02)_35%,
          rgba(255,255,255,.15)_43%,
          rgba(255,255,255,.85)_49%,
          rgba(255,255,255,1)_50%,
          rgba(255,255,255,.65)_51%,
          rgba(255,255,255,.12)_58%,
          transparent_75%
        )]

        blur-[7px]

        shadow-[0_0_25px_rgba(255,255,255,.45)]

        animate-[aiLightSweep_2.4s_cubic-bezier(.45,0,.25,1)_infinite]
      "
                  />

                  {/* Thin Scan */}
                  <div
                    className="
        absolute
        left-0

        z-[5]

        h-[2px]
        w-full

        bg-[linear-gradient(
          90deg,
          transparent,
          rgba(0,200,255,.2),
          rgba(255,255,255,.95),
          rgba(255,30,80,.35),
          transparent
        )]

        shadow-[0_0_10px_rgba(0,200,255,.8),0_0_25px_rgba(255,30,80,.5)]

        animate-[aiHorizontalScan_2.1s_ease-in-out_infinite]
      "
                  />

                  {/* Progress Content */}
                  <div
                    className="
        absolute inset-0 z-[100]

        flex
        items-center
        justify-center
      "
                  >

                    {/* Progress Card */}
                    <div
                      className="
          min-w-[250px]

          rounded-[18px]

          border
          border-white/5

          bg-slate-950/10

          px-6
          py-5

          text-center

          shadow-[0_20px_60px_rgba(0,0,0,.45),0_0_35px_rgba(0,180,255,.08)]

          backdrop-blur-[18px]
        "
                    >

                      {/* Title */}
                      <div
                        className="
            mb-2

            flex
            items-center
            justify-center

            gap-2

            text-sm
            font-semibold
            text-white
          "
                      >

                        <span
                          className="
              h-[15px]
              w-[15px]
              shrink-0

              rounded-full

              border-2
              border-white/20

              border-t-[rgba(0,179,255,.77)]
              border-r-[rgba(255,30,79,.57)]

              animate-spin
            "
                        />

                        <span>
                          AI Object Removing...
                        </span>

                      </div>


                      {/* Percentage */}
                      <div
                        className="
            mb-2.5

            text-[32px]
            font-extrabold
            leading-none
            text-white

            [text-shadow:0_0_15px_rgba(0,200,255,.35)]
          "
                      >
                        {Math.round(aiProgress)}%
                      </div>


                      {/* Progress Track */}
                      <div
                        className="
            relative

            h-[6px]
            w-[210px]

            overflow-visible

            rounded-full

            bg-white/10
          "
                      >

                        {/* Progress Fill */}
                        <div
                          className="
              relative

              h-full

              overflow-visible

              rounded-full

              isolate

              bg-gradient-to-r
              from-[rgba(0,179,255,.65)]
              via-[rgba(124,58,237,.65)]
              to-[rgba(255,30,79,.65)]

              shadow-[0_0_12px_rgba(0,180,255,.55),0_0_20px_rgba(255,30,80,.25)]

              transition-[width]
              duration-150
              ease-linear

              after:absolute
              after:left-[-80px]
              after:top-[-8px]

              after:h-[calc(100%+16px)]
              after:w-[80px]

              after:z-[2]

              after:pointer-events-none

              after:bg-[linear-gradient(
                90deg,
                transparent_0%,
                rgba(255,255,255,.05)_20%,
                rgba(255,255,255,.45)_40%,
                rgba(255,255,255,1)_50%,
                rgba(255,255,255,.45)_60%,
                rgba(255,255,255,.05)_80%,
                transparent_100%
              )]

              after:blur-[8px]

              after:shadow-[0_0_12px_rgba(255,255,255,.55),0_0_24px_rgba(0,180,255,.25)]

              after:translate-x-0
              after:translate-y-0

              after:animate-[aiProgressShine_1.1s_linear_infinite]
            "
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, aiProgress)
                            )}%`,
                          }}
                        />

                      </div>


                      {/* Progress Text */}
                      <div
                        className="
            mt-[9px]

            text-[10px]

            tracking-[0.2px]

            text-white/50
          "
                      >
                        {aiProgressLabel}
                      </div>

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
