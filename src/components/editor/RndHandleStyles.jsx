/* =====================================================
   RND RESIZE HANDLES - 8 TOTAL
   4 CORNERS + 4 EXACT MIDDLE-SIDE HANDLES
===================================================== */

const css = `
  .everything-rnd-handle {
    position: absolute !important;
    width: 20px !important;
    height: 20px !important;
    border-radius: 6px !important;
    border: 2px solid white !important;
    background: rgb(124, 58, 237) !important;
    box-shadow:
      0 0 0 2px rgba(124, 58, 237, 0.35),
      0 5px 18px rgba(0, 0, 0, 0.28) !important;
    z-index: 80 !important;
    box-sizing: border-box !important;
  }

  .everything-rnd-handle-top {
    width: 22px !important;
    height: 12px !important;
    left: 50% !important;
    top: 0 !important;
    right: auto !important;
    bottom: auto !important;
    transform: translate(-50%, -50%) !important;
    border-radius: 999px !important;
    cursor: ns-resize !important;
  }

  .everything-rnd-handle-right {
    width: 12px !important;
    height: 22px !important;
    right: 0 !important;
    top: 50% !important;
    left: auto !important;
    bottom: auto !important;
    transform: translate(50%, -50%) !important;
    border-radius: 999px !important;
    cursor: ew-resize !important;
  }

  .everything-rnd-handle-bottom {
    width: 22px !important;
    height: 12px !important;
    left: 50% !important;
    bottom: 0 !important;
    right: auto !important;
    top: auto !important;
    transform: translate(-50%, 50%) !important;
    border-radius: 999px !important;
    cursor: ns-resize !important;
  }

  .everything-rnd-handle-left {
    width: 12px !important;
    height: 22px !important;
    left: 0 !important;
    top: 50% !important;
    right: auto !important;
    bottom: auto !important;
    transform: translate(-50%, -50%) !important;
    border-radius: 999px !important;
    cursor: ew-resize !important;
  }

  .everything-rnd-handle-top-left { cursor: nwse-resize !important; }
  .everything-rnd-handle-top-right { cursor: nesw-resize !important; }
  .everything-rnd-handle-bottom-right { cursor: nwse-resize !important; }
  .everything-rnd-handle-bottom-left { cursor: nesw-resize !important; }

  .everything-rnd-handle:hover {
    background: rgb(139, 92, 246) !important;
  }
`;

export default function RndHandleStyles() {
  return <style>{css}</style>;
}
