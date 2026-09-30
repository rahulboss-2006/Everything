import { useEffect } from "react";
import { clamp } from "../utils/editorTools/canvasHelpers";

/*
  CROP MODE: MOUSE WHEEL ZOOM
  Native listener (passive: false) because React's onWheel
  cannot preventDefault(), and the page would scroll too.
*/
export default function useCropWheelZoom(cropMode, previewRef, setZoom) {
  useEffect(() => {
    if (!cropMode) return;

    const element = previewRef.current;
    if (!element) return;

    function handleWheel(event) {
      event.preventDefault();

      setZoom((current) => {
        const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
        let next = current * factor;

        if (Math.round(next) === current) {
          next = current + (event.deltaY < 0 ? 1 : -1);
        }

        return clamp(Math.round(next), 1, 1000);
      });
    }

    element.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      element.removeEventListener("wheel", handleWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropMode]);
}
