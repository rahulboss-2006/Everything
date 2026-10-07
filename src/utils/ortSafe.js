let lockPromise = null;

const SAFE_WASM_THREADS = 1;
const SAFE_WASM_PROXY = false;

function lockProperty(target, name, value) {
  if (!target) {
    return;
  }

  try {
    Object.defineProperty(target, name, {
      configurable: true,
      enumerable: true,

      get() {
        return value;
      },

      set() {
        // Ignore later attempts to change the safety setting.
      },
    });
  } catch {
    // Ignore environments where the property cannot be redefined.
  }
}

function configureSafeOrt(ort) {
  if (!ort) {
    throw new Error(
      "ONNX Runtime module is empty."
    );
  }

  const wasm = ort?.env?.wasm;

  if (!wasm) {
    console.warn(
      "[ORT] WASM environment is unavailable."
    );

    return ort;
  }

  /*
   * GitHub Pages is a static host.
   *
   * Keep WASM single-threaded and disable
   * worker proxying for maximum compatibility.
   */
  lockProperty(
    wasm,
    "numThreads",
    SAFE_WASM_THREADS
  );

  lockProperty(
    wasm,
    "proxy",
    SAFE_WASM_PROXY
  );

  /*
   * SIMD is still allowed.
   * SIMD does not require multi-threaded WASM.
   */
  try {
    wasm.simd = true;
  } catch {
    // Continue without SIMD if unavailable.
  }

  try {
    ort.env.logLevel = "error";
  } catch {
    // Ignore unsupported logLevel.
  }

  console.log(
    "[ORT] Safe configuration:",
    {
      numThreads: wasm.numThreads,
      proxy: wasm.proxy,
      simd: wasm.simd,
    }
  );

  return ort;
}

export function getSafeOrt() {
  if (!lockPromise) {
    lockPromise = (async () => {
      /*
       * Dynamic import keeps ORT out of the initial
       * application loading path.
       */
      const module =
        await import("onnxruntime-web");

      const ort =
        module.default ?? module;

      return configureSafeOrt(ort);
    })().catch((error) => {
      /*
       * Important:
       * If loading fails once, allow a future attempt.
       */
      lockPromise = null;

      console.error(
        "[ORT] Failed to load ONNX Runtime.",
        error
      );

      throw error;
    });
  }

  return lockPromise;
}