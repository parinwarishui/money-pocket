// Validated categorical palette (colorblind-safe adjacent contrast —
// see Anthropic's internal dataviz guidelines). Colors are assigned by
// each category's stable position in the user's category list, not by
// sort rank, so a bar never changes color just because the chart
// re-sorts by amount.
const PALETTE = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#6250d6", // violet
  "#e34948", // red
];

// Categories past the palette's 8 slots all fold into this muted grey
// rather than generating new hues.
const OTHER_COLOR = "#9a9890";

export function colorForCategoryIndex(index) {
  return index >= 0 && index < PALETTE.length ? PALETTE[index] : OTHER_COLOR;
}
