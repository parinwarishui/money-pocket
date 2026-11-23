// Category icons come from Google's Material Symbols set
// (https://fonts.google.com/icons) and are stored as their plain ASCII
// ligature name (e.g. "restaurant"), never as an emoji glyph. The emoji
// approach broke under xlsx import/export: multi-byte Unicode characters
// above the Basic Multilingual Plane got mangled by the xlsx reader's
// entity decoding. An ASCII identifier has no such failure mode.

export const DEFAULT_ICON = "category";

// Curated preset shown in the category icon picker.
export const ICON_OPTIONS = [
  "restaurant", "lunch_dining", "local_cafe", "icecream", "liquor",
  "directions_bus", "directions_car", "local_taxi", "flight", "local_gas_station",
  "shopping_bag", "checkroom", "laptop_mac", "smartphone", "sports_esports",
  "receipt_long", "water_drop", "wifi", "home", "build",
  "movie", "music_note", "confirmation_number", "menu_book", "medication",
  "fitness_center", "content_cut", "pets", "card_giftcard", "inventory_2",
  "payments", "savings", "school", "celebration", DEFAULT_ICON,
];

// Maps a category's name back to a sensible icon. Used to migrate old
// emoji-based data (where the emoji itself may be corrupted but the name
// never was) and as a fallback for categories imported without an icon.
const NAME_TO_ICON = {
  Food: "restaurant",
  Transport: "directions_bus",
  Shopping: "shopping_bag",
  Bills: "receipt_long",
  Entertainment: "movie",
  Housing: "home",
  Health: "medication",
  Other: "inventory_2",
  Income: "payments",
};

export function iconForName(name) {
  return NAME_TO_ICON[name] || DEFAULT_ICON;
}
