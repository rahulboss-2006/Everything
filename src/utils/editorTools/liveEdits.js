import { getEffectLabel } from "./effectHelpers";

/* Human readable list of the not-yet-applied adjustments. */
export function getLiveEditLabels({
  brightness,
  contrast,
  saturation,
  rotation,
  flipX,
  flipY,
  selectedEffects,
}) {
  const edits = [];
  const signed = (n) => `${n > 0 ? "+" : ""}${n}`;

  if (brightness !== 0) edits.push(`Brightness ${signed(brightness)}`);
  if (contrast !== 0) edits.push(`Contrast ${signed(contrast)}`);
  if (saturation !== 0) edits.push(`Saturation ${signed(saturation)}`);
  if (rotation !== 0) edits.push(`Rotated ${rotation}°`);
  if (flipX) edits.push("Flipped horizontally");
  if (flipY) edits.push("Flipped vertically");

  selectedEffects.forEach((id) => {
    edits.push(`Effect: ${getEffectLabel(id)}`);
  });

  return edits;
}
