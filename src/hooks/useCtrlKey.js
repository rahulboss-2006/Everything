import { useEffect, useState } from "react";

export default function useCtrlKey() {
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Control") setIsCtrlPressed(true);
    }

    function handleKeyUp(event) {
      if (event.key === "Control") setIsCtrlPressed(false);
    }

    function handleBlur() {
      setIsCtrlPressed(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return isCtrlPressed;
}
