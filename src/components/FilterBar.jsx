import { formatPeriodLabel } from "../utils/dateUtils.js";

const PERIOD_TYPES = [
  { value: "all", label: "All time" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "expense", label: "Spending" },
  { value: "income", label: "Income" },
];

export default function FilterBar({
  categories,
  categoryFilter,
  onCategoryFilterChange,
  typeFilter,
  onTypeFilterChange,
  periodType,
  onPeriodTypeChange,
  anchorISO,
  onShiftAnchor,
}) {
  return (
    <div className="filter-bar">
      <select value={typeFilter} onChange={(e) => onTypeFilterChange(e.target.value)}>
        {TYPE_FILTERS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <select
        value={categoryFilter}
        onChange={(e) => onCategoryFilterChange(e.target.value)}
        disabled={typeFilter === "income"}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.name}>
            {c.name}
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
