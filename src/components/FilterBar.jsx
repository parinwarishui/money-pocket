import { formatPeriodLabel } from "../utils/dateUtils.js";

const PERIOD_TYPES = [
  { value: "all", label: "All time" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export default function FilterBar({
  categories,
  categoryFilter,
  onCategoryFilterChange,
  periodType,
  onPeriodTypeChange,
  anchorISO,
  onShiftAnchor,
}) {
  return (
    <div className="filter-bar">
      <select value={categoryFilter} onChange={(e) => onCategoryFilterChange(e.target.value)}>
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.name}>
            {c.emoji} {c.name}
          </option>
        ))}
      </select>

      <select value={periodType} onChange={(e) => onPeriodTypeChange(e.target.value)}>
        {PERIOD_TYPES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      {periodType !== "all" && (
        <div className="period-nav">
          <button onClick={() => onShiftAnchor("prev")} aria-label="Previous period">‹</button>
          <span>{formatPeriodLabel(periodType, anchorISO)}</span>
          <button onClick={() => onShiftAnchor("next")} aria-label="Next period">›</button>
        </div>
      )}
    </div>
  );
}
