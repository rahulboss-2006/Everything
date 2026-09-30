/*
=========================================================
EDITOR EFFECTS
100 CSS FILTER BASED EFFECTS
=========================================================
*/

const makeEffect = (id, name, category, filter) => ({
  id,
  name,
  category,
  filter,
});


/* =========================================================
   EFFECT PRESETS
========================================================= */

export const EFFECT_PRESETS = [

  /* =========================
     BASIC 01 - 20
  ========================= */

  makeEffect(
    "effect_01",
    "Bright",
    "Basic",
    "brightness(1.18)"
  ),

  makeEffect(
    "effect_02",
    "Dark",
    "Basic",
    "brightness(0.78)"
  ),

  makeEffect(
    "effect_03",
    "Contrast",
    "Basic",
    "contrast(1.35)"
  ),

  makeEffect(
    "effect_04",
    "Soft Contrast",
    "Basic",
    "contrast(0.86)"
  ),

  makeEffect(
    "effect_05",
    "Saturated",
    "Basic",
    "saturate(1.45)"
  ),

  makeEffect(
    "effect_06",
    "Desaturated",
    "Basic",
    "saturate(0.62)"
  ),

  makeEffect(
    "effect_07",
    "Fade",
    "Basic",
    "contrast(0.82) brightness(1.08) saturate(0.82)"
  ),

  makeEffect(
    "effect_08",
    "Crisp",
    "Basic",
    "contrast(1.28) saturate(1.12)"
  ),

  makeEffect(
    "effect_09",
    "Soft",
    "Basic",
    "contrast(0.88) brightness(1.06) saturate(0.92)"
  ),

  makeEffect(
    "effect_10",
    "Deep",
    "Basic",
    "contrast(1.32) brightness(0.92)"
  ),

  makeEffect(
    "effect_11",
    "Glow",
    "Basic",
    "brightness(1.15) saturate(1.08)"
  ),

  makeEffect(
    "effect_12",
    "Matte",
    "Basic",
    "contrast(0.82) brightness(1.04) saturate(0.78)"
  ),

  makeEffect(
    "effect_13",
    "Punch",
    "Basic",
    "contrast(1.42) saturate(1.32)"
  ),

  makeEffect(
    "effect_14",
    "Clear",
    "Basic",
    "contrast(1.18) brightness(1.05) saturate(1.08)"
  ),

  makeEffect(
    "effect_15",
    "Muted",
    "Basic",
    "contrast(0.9) saturate(0.68)"
  ),

  makeEffect(
    "effect_16",
    "Low Light",
    "Basic",
    "brightness(0.88) contrast(1.12)"
  ),

  makeEffect(
    "effect_17",
    "High Key",
    "Basic",
    "brightness(1.3) contrast(0.9)"
  ),

  makeEffect(
    "effect_18",
    "Low Key",
    "Basic",
    "brightness(0.72) contrast(1.22)"
  ),

  makeEffect(
    "effect_19",
    "Ultra Color",
    "Basic",
    "saturate(1.75) contrast(1.12)"
  ),

  makeEffect(
    "effect_20",
    "Neutral",
    "Basic",
    "brightness(1) contrast(1) saturate(1)"
  ),


  /* =========================
     VINTAGE 21 - 35
  ========================= */

  makeEffect(
    "effect_21",
    "Vintage",
    "Vintage",
    "sepia(0.42) contrast(0.92) saturate(0.82)"
  ),

  makeEffect(
    "effect_22",
    "Old Film",
    "Vintage",
    "sepia(0.62) contrast(0.9) brightness(1.04)"
  ),

  makeEffect(
    "effect_23",
    "Retro",
    "Vintage",
    "sepia(0.34) saturate(1.18) contrast(1.05)"
  ),

  makeEffect(
    "effect_24",
    "Classic",
    "Vintage",
    "sepia(0.28) contrast(1.08) saturate(0.88)"
  ),

  makeEffect(
    "effect_25",
    "Polaroid",
    "Vintage",
    "sepia(0.18) brightness(1.12) contrast(0.9) saturate(0.9)"
  ),

  makeEffect(
    "effect_26",
    "Dusty",
    "Vintage",
    "sepia(0.3) brightness(1.08) saturate(0.7)"
  ),

  makeEffect(
    "effect_27",
    "Sepia",
    "Vintage",
    "sepia(0.9)"
  ),

  makeEffect(
    "effect_28",
    "Golden Age",
    "Vintage",
    "sepia(0.5) saturate(1.18) brightness(1.04)"
  ),

  makeEffect(
    "effect_29",
    "Faded Film",
    "Vintage",
    "sepia(0.24) contrast(0.76) brightness(1.12)"
  ),

  makeEffect(
    "effect_30",
    "Brown Tone",
    "Vintage",
    "sepia(0.7) contrast(1.04)"
  ),

  makeEffect(
    "effect_31",
    "Warm Retro",
    "Vintage",
    "sepia(0.38) saturate(1.28) brightness(1.03)"
  ),

  makeEffect(
    "effect_32",
    "Old Camera",
    "Vintage",
    "sepia(0.52) contrast(1.16) saturate(0.82)"
  ),

  makeEffect(
    "effect_33",
    "Film Wash",
    "Vintage",
    "sepia(0.25) contrast(0.78) saturate(0.76)"
  ),

  makeEffect(
    "effect_34",
    "Antique",
    "Vintage",
    "sepia(0.75) contrast(0.88) brightness(1.03)"
  ),

  makeEffect(
    "effect_35",
    "Retro Pop",
    "Vintage",
    "sepia(0.18) contrast(1.18) saturate(1.35)"
  ),


  /* =========================
     CINEMATIC 36 - 50
  ========================= */

  makeEffect(
    "effect_36",
    "Cinematic",
    "Cinematic",
    "contrast(1.2) saturate(0.86) brightness(0.96)"
  ),

  makeEffect(
    "effect_37",
    "Movie",
    "Cinematic",
    "contrast(1.3) saturate(0.82) brightness(0.94)"
  ),

  makeEffect(
    "effect_38",
    "Teal Mood",
    "Cinematic",
    "hue-rotate(150deg) saturate(0.92) contrast(1.12)"
  ),

  makeEffect(
    "effect_39",
    "Cool Film",
    "Cinematic",
    "hue-rotate(185deg) saturate(0.82) contrast(1.15)"
  ),

  makeEffect(
    "effect_40",
    "Drama",
    "Cinematic",
    "contrast(1.48) brightness(0.9) saturate(0.82)"
  ),

  makeEffect(
    "effect_41",
    "Noir Film",
    "Cinematic",
    "grayscale(0.65) contrast(1.38)"
  ),

  makeEffect(
    "effect_42",
    "Blockbuster",
    "Cinematic",
    "contrast(1.34) saturate(1.12) brightness(0.94)"
  ),

  makeEffect(
    "effect_43",
    "Moody Blue",
    "Cinematic",
    "hue-rotate(175deg) brightness(0.9) contrast(1.18)"
  ),

  makeEffect(
    "effect_44",
    "Warm Cinema",
    "Cinematic",
    "sepia(0.2) saturate(1.16) contrast(1.2)"
  ),

  makeEffect(
    "effect_45",
    "Dark Cinema",
    "Cinematic",
    "brightness(0.78) contrast(1.4) saturate(0.84)"
  ),

  makeEffect(
    "effect_46",
    "Epic",
    "Cinematic",
    "contrast(1.38) saturate(1.2) brightness(0.92)"
  ),

  makeEffect(
    "effect_47",
    "Indie Film",
    "Cinematic",
    "sepia(0.12) contrast(0.94) saturate(0.84)"
  ),

  makeEffect(
    "effect_48",
    "Film Blue",
    "Cinematic",
    "hue-rotate(195deg) saturate(0.9) contrast(1.2)"
  ),

  makeEffect(
    "effect_49",
    "Film Gold",
    "Cinematic",
    "sepia(0.3) saturate(1.24) contrast(1.14)"
  ),

  makeEffect(
    "effect_50",
    "Trailer",
    "Cinematic",
    "contrast(1.52) brightness(0.86) saturate(0.9)"
  ),


  /* =========================
     COLOR 51 - 65
  ========================= */

  makeEffect(
    "effect_51",
    "Warm",
    "Color",
    "sepia(0.18) saturate(1.18)"
  ),

  makeEffect(
    "effect_52",
    "Cool",
    "Color",
    "hue-rotate(180deg) saturate(0.92)"
  ),

  makeEffect(
    "effect_53",
    "Rose",
    "Color",
    "hue-rotate(315deg) saturate(1.18)"
  ),

  makeEffect(
    "effect_54",
    "Purple",
    "Color",
    "hue-rotate(275deg) saturate(1.28)"
  ),

  makeEffect(
    "effect_55",
    "Violet",
    "Color",
    "hue-rotate(260deg) saturate(1.34)"
  ),

  makeEffect(
    "effect_56",
    "Blue",
    "Color",
    "hue-rotate(200deg) saturate(1.25)"
  ),

  makeEffect(
    "effect_57",
    "Aqua",
    "Color",
    "hue-rotate(165deg) saturate(1.28)"
  ),

  makeEffect(
    "effect_58",
    "Cyan",
    "Color",
    "hue-rotate(155deg) saturate(1.3)"
  ),

  makeEffect(
    "effect_59",
    "Green",
    "Color",
    "hue-rotate(95deg) saturate(1.22)"
  ),

  makeEffect(
    "effect_60",
    "Lime",
    "Color",
    "hue-rotate(70deg) saturate(1.34)"
  ),

  makeEffect(
    "effect_61",
    "Yellow",
    "Color",
    "hue-rotate(35deg) saturate(1.28)"
  ),

  makeEffect(
    "effect_62",
    "Orange",
    "Color",
    "hue-rotate(12deg) saturate(1.32)"
  ),

  makeEffect(
    "effect_63",
    "Red",
    "Color",
    "hue-rotate(345deg) saturate(1.3)"
  ),

  makeEffect(
    "effect_64",
    "Magenta",
    "Color",
    "hue-rotate(320deg) saturate(1.3)"
  ),

  makeEffect(
    "effect_65",
    "Color Boost",
    "Color",
    "saturate(1.65) contrast(1.08)"
  ),


  /* =========================
     BLACK & WHITE 66 - 75
  ========================= */

  makeEffect(
    "effect_66",
    "B&W",
    "B&W",
    "grayscale(1)"
  ),

  makeEffect(
    "effect_67",
    "Mono Soft",
    "B&W",
    "grayscale(1) contrast(0.86) brightness(1.05)"
  ),

  makeEffect(
    "effect_68",
    "Mono Strong",
    "B&W",
    "grayscale(1) contrast(1.42)"
  ),

  makeEffect(
    "effect_69",
    "Mono Fade",
    "B&W",
    "grayscale(1) contrast(0.76) brightness(1.1)"
  ),

  makeEffect(
    "effect_70",
    "Noir",
    "B&W",
    "grayscale(1) contrast(1.55) brightness(0.9)"
  ),

  makeEffect(
    "effect_71",
    "Silver",
    "B&W",
    "grayscale(1) brightness(1.12) contrast(1.08)"
  ),

  makeEffect(
    "effect_72",
    "Charcoal",
    "B&W",
    "grayscale(1) contrast(1.35) brightness(0.82)"
  ),

  makeEffect(
    "effect_73",
    "Classic Mono",
    "B&W",
    "grayscale(1) sepia(0.08) contrast(1.15)"
  ),

  makeEffect(
    "effect_74",
    "Soft Noir",
    "B&W",
    "grayscale(1) contrast(1.2) brightness(1.02)"
  ),

  makeEffect(
    "effect_75",
    "High Contrast B&W",
    "B&W",
    "grayscale(1) contrast(1.75)"
  ),


  /* =========================
     CREATIVE 76 - 90
  ========================= */

  makeEffect(
    "effect_76",
    "Dream",
    "Creative",
    "brightness(1.12) saturate(0.82) contrast(0.86) blur(0.3px)"
  ),

  makeEffect(
    "effect_77",
    "Dreamy",
    "Creative",
    "brightness(1.16) contrast(0.82) saturate(0.88) blur(0.5px)"
  ),

  makeEffect(
    "effect_78",
    "Haze",
    "Creative",
    "brightness(1.1) contrast(0.8) blur(0.7px)"
  ),

  makeEffect(
    "effect_79",
    "Soft Focus",
    "Creative",
    "brightness(1.04) contrast(0.88) blur(0.9px)"
  ),

  makeEffect(
    "effect_80",
    "Sharp",
    "Creative",
    "contrast(1.55) saturate(1.18)"
  ),

  makeEffect(
    "effect_81",
    "Hyper",
    "Creative",
    "contrast(1.6) saturate(1.55)"
  ),

  makeEffect(
    "effect_82",
    "Electric",
    "Creative",
    "saturate(1.7) contrast(1.28) hue-rotate(8deg)"
  ),

  makeEffect(
    "effect_83",
    "Frost",
    "Creative",
    "hue-rotate(185deg) brightness(1.16) saturate(0.72)"
  ),

  makeEffect(
    "effect_84",
    "Mystic",
    "Creative",
    "hue-rotate(265deg) saturate(1.12) contrast(1.08)"
  ),

  makeEffect(
    "effect_85",
    "Candy",
    "Creative",
    "saturate(1.5) brightness(1.1) hue-rotate(325deg)"
  ),

  makeEffect(
    "effect_86",
    "Neon",
    "Creative",
    "saturate(1.85) contrast(1.35) brightness(1.04)"
  ),

  makeEffect(
    "effect_87",
    "Pastel",
    "Creative",
    "saturate(0.68) brightness(1.18) contrast(0.82)"
  ),

  makeEffect(
    "effect_88",
    "Cyber",
    "Creative",
    "hue-rotate(215deg) saturate(1.6) contrast(1.32)"
  ),

  makeEffect(
    "effect_89",
    "Fantasy",
    "Creative",
    "hue-rotate(285deg) saturate(1.2) brightness(1.08)"
  ),

  makeEffect(
    "effect_90",
    "Pop Art",
    "Creative",
    "contrast(1.5) saturate(1.7)"
  ),


  /* =========================
     LIGHT & MOOD 91 - 100
  ========================= */

  makeEffect(
    "effect_91",
    "Sunlight",
    "Light & Mood",
    "brightness(1.22) sepia(0.12) saturate(1.12)"
  ),

  makeEffect(
    "effect_92",
    "Sunset",
    "Light & Mood",
    "sepia(0.28) saturate(1.32) brightness(1.02)"
  ),

  makeEffect(
    "effect_93",
    "Golden Hour",
    "Light & Mood",
    "sepia(0.22) saturate(1.24) brightness(1.1)"
  ),

  makeEffect(
    "effect_94",
    "Moonlight",
    "Light & Mood",
    "hue-rotate(190deg) brightness(0.9) contrast(1.08)"
  ),

  makeEffect(
    "effect_95",
    "Midnight",
    "Light & Mood",
    "hue-rotate(205deg) brightness(0.68) contrast(1.22) saturate(0.86)"
  ),

  makeEffect(
    "effect_96",
    "Morning",
    "Light & Mood",
    "brightness(1.18) contrast(0.9) saturate(1.04)"
  ),

  makeEffect(
    "effect_97",
    "Cloudy",
    "Light & Mood",
    "brightness(0.96) contrast(0.82) saturate(0.72)"
  ),

  makeEffect(
    "effect_98",
    "Storm",
    "Light & Mood",
    "brightness(0.78) contrast(1.32) saturate(0.66) hue-rotate(185deg)"
  ),

  makeEffect(
    "effect_99",
    "Cozy",
    "Light & Mood",
    "sepia(0.18) brightness(1.06) saturate(1.08) contrast(0.94)"
  ),

  makeEffect(
    "effect_100",
    "Ethereal",
    "Light & Mood",
    "brightness(1.18) contrast(0.78) saturate(0.9) hue-rotate(12deg)"
  ),
];


/* =========================================================
   EFFECT CATEGORIES
========================================================= */

export const EFFECT_CATEGORIES = [
  {
    id: "basic",
    name: "Basic",
    effects: EFFECT_PRESETS.filter(
      (effect) => effect.category === "Basic"
    ),
  },

  {
    id: "vintage",
    name: "Vintage",
    effects: EFFECT_PRESETS.filter(
      (effect) => effect.category === "Vintage"
    ),
  },

  {
    id: "cinematic",
    name: "Cinematic",
    effects: EFFECT_PRESETS.filter(
      (effect) => effect.category === "Cinematic"
    ),
  },

  {
    id: "color",
    name: "Color",
    effects: EFFECT_PRESETS.filter(
      (effect) => effect.category === "Color"
    ),
  },

  {
    id: "bw",
    name: "B&W",
    effects: EFFECT_PRESETS.filter(
      (effect) => effect.category === "B&W"
    ),
  },

  {
    id: "creative",
    name: "Creative",
    effects: EFFECT_PRESETS.filter(
      (effect) => effect.category === "Creative"
    ),
  },

  {
    id: "light_mood",
    name: "Light & Mood",
    effects: EFFECT_PRESETS.filter(
      (effect) => effect.category === "Light & Mood"
    ),
  },
];


/* =========================================================
   FAST LOOKUP MAP
========================================================= */

export const EFFECT_PRESET_MAP =
  EFFECT_PRESETS.reduce(
    (map, effect) => {
      map[effect.id] = effect;
      return map;
    },
    {}
  );


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default EFFECT_PRESETS;