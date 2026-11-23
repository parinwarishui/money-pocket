// Renders one Material Symbols icon (https://fonts.google.com/icons) by
// its ligature name, e.g. <Icon name="restaurant" />. The font is loaded
// globally in index.html; this component just applies the right class.
export default function Icon({ name, className = "" }) {
  if (!name) return null;
  return (
    <span className={`material-symbols-outlined${className ? " " + className : ""}`} aria-hidden="true">
      {name}
    </span>
  );
}
