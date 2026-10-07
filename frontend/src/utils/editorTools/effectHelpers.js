import { EFFECT_PRESETS } from "../editorEffects";

export function getEffectList() {
  if (Array.isArray(EFFECT_PRESETS)) return EFFECT_PRESETS;

  if (EFFECT_PRESETS && typeof EFFECT_PRESETS === "object") {
    return Object.values(EFFECT_PRESETS).flatMap((value) =>
      Array.isArray(value) ? value : [value]
    );
  }

  return [];
}

export function getEffectPreset(id) {
  return getEffectList().find((effect) => effect?.id === id);
}

export function getEffectLabel(id) {
  const preset = getEffectPreset(id);
  return preset?.label || preset?.name || id;
}
