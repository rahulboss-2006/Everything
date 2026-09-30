import { useEffect } from "react";
import { enableWheelSliders } from "../utils/wheelSliders";

export default function useWheelSlidersEffect() {
  useEffect(() => {
    const cleanup = enableWheelSliders({ throttleMs: 40 });
    return cleanup;
  }, []);
}
