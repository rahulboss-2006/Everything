import { useEffect, useRef } from "react";
import { loadImage } from "../utils/imageEditor";

/*
  Loads `workingFile` into an HTMLImage.
  onLoaded(image, width, height) is called once it is ready.
*/
export default function useLoadImage(workingFile, onLoaded) {
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (!workingFile) return;

        const loaded = await loadImage(workingFile);

        if (cancelled || !loaded) return;

        const width = loaded.naturalWidth || loaded.width || 1;
        const height = loaded.naturalHeight || loaded.height || 1;

        onLoadedRef.current?.(loaded, width, height);
      } catch (error) {
        console.error("Image loading failed:", error);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [workingFile]);
}
