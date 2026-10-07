export const CROP_PRESETS = [
  { id: "free", label: "Free", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:2", label: "3:2", ratio: 3 / 2 },
  { id: "5:4", label: "5:4", ratio: 5 / 4 },
  { id: "7:5", label: "7:5", ratio: 7 / 5 },
  { id: "16:10", label: "16:10", ratio: 16 / 10 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "21:9", label: "21:9", ratio: 21 / 9 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "2:3", label: "2:3", ratio: 2 / 3 },
  { id: "5:7", label: "5:7", ratio: 5 / 7 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
];

export const DEFAULT_CROP_BOX = { x: 10, y: 10, width: 80, height: 80 };
export const MIN_CROP_SIZE = 5;
export const HISTORY_LIMIT = 50;
