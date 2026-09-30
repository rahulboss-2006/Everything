export function enableWheelSliders({ throttleMs = 40 } = {}) {
  const valueSetter =
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    ).set;

  let lastTime = 0;

  function handleWheel(event) {
    const el = event.target;

    if (
      !(el instanceof HTMLInputElement) ||
      el.type !== "range"
    ) {
      return;
    }

    if (
      el.disabled ||
      el.dataset.noWheel !== undefined
    ) {
      return;
    }

    if (event.ctrlKey) return;

    const delta = event.deltaY || event.deltaX;

    if (!delta) return;

    event.preventDefault();

    const now = performance.now();

    if (now - lastTime < throttleMs) return;

    lastTime = now;

    const min =
      el.min !== ""
        ? Number(el.min)
        : 0;

    const max =
      el.max !== ""
        ? Number(el.max)
        : 100;

    const step =
      el.step === "any"
        ? (max - min) / 100
        : Number(el.step) || 1;

    const direction =
      delta < 0 ? 1 : -1;

    const multiplier =
      event.shiftKey ? 10 : 1;

    const current = Number(el.value);

    const decimals =
      (String(step).split(".")[1] || "").length;

    let next =
      current +
      direction *
        step *
        multiplier;

    next = Math.min(
      max,
      Math.max(min, next)
    );

    next = Number(
      next.toFixed(decimals)
    );

    if (next === current) return;

    valueSetter.call(
      el,
      String(next)
    );

    el.dispatchEvent(
      new Event("input", {
        bubbles: true,
      })
    );

    el.dispatchEvent(
      new Event("change", {
        bubbles: true,
      })
    );
  }

  document.addEventListener(
    "wheel",
    handleWheel,
    {
      passive: false,
    }
  );

  return () =>
    document.removeEventListener(
      "wheel",
      handleWheel
    );
}