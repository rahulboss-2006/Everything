/*
  ONNX Runtime safety lock.

  PROBLEM
  -------
  Vite puts ONNX Runtime inside a normal JS chunk. When ONNX Runtime
  starts extra threads (Web Workers) it loads that SAME chunk inside
  the worker, and that chunk imports the main app chunk. The main app
  code needs `document`, which does not exist in a worker, so every
  worker crashes with:

      Uncaught ReferenceError: document is not defined

  GitHub Pages cannot send the COOP/COEP headers that real multi-thread
  WASM needs anyway, so extra threads never help here.

  FIX
  ---
  Force ONNX Runtime to ONE thread and NO proxy worker unless the page
  is truly cross-origin isolated. The background remover (imgly) tries
  to set numThreads = number of CPU cores, so we lock the property.
  Both the Object Eraser and the Background Remover share this single
  ONNX Runtime instance, so locking it once protects both.
*/

let lockPromise = null;

function allowedThreads() {
  if (
    typeof window !== "undefined" &&
    window.crossOriginIsolated === true
  ) {
    return Math.min(
      4,
      Math.max(1, Number(navigator.hardwareConcurrency) || 2)
    );
  }

  return 1;
}

function lockProperty(target, name, getValue) {
  try {
    Object.defineProperty(target, name, {
      configurable: true,
      enumerable: true,
      get: getValue,
      set() {
        /* ignore attempts to change it */
      },
    });
  } catch {
    /* If the property cannot be locked, keep going. */
  }
}

export function getSafeOrt() {
  if (!lockPromise) {
    lockPromise = (async () => {
      const module = await import("onnxruntime-web");
      const ort = module.default ?? module;
      const wasm = ort?.env?.wasm;

      if (wasm) {
        lockProperty(wasm, "numThreads", allowedThreads);
        lockProperty(wasm, "proxy", () => false);
      }

      return ort;
    })().catch((error) => {
      lockPromise = null;
      throw error;
    });
  }

  return lockPromise;
}
