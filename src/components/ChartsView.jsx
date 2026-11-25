import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { getCurrency } from "../data/currencies.js";
import { colorForCategoryIndex } from "../data/chartColors.js";
import { getPeriodRange, shiftAnchor, formatPeriodLabel, todayISO } from "../utils/dateUtils.js";
import Icon from "./Icon.jsx";

const PERIOD_TYPES = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export default function ChartsView({ onClose }) {
  const { transactions, expenseCategories, activeCurrencyCodes, lastUsedCurrencyCode } = useApp();

  const [periodType, setPeriodType] = useState("month");
  const [anchorISO, setAnchorISO] = useState(todayISO());
  const [currencyCode, setCurrencyCode] = useState(lastUsedCurrencyCode);

  function handleShiftAnchor(direction) {
    setAnchorISO((prev) => shiftAnchor(periodType, prev, direction));
  }

  // Stable per-category color: keyed by each category's position in the
  // expense category list (this chart is spending-only), not by how the
  // bars end up sorted.
  const categoryIndexByName = useMemo(() => {
    const map = new Map();
    expenseCategories.forEach((c, i) => map.set(c.name, i));
    return map;
  }, [expenseCategories]);

  const bars = useMemo(() => {
    const range = getPeriodRange(periodType, anchorISO);
    const totals = new Map(); // categoryName -> { icon, total }

    for (const tx of transactions) {
      if (tx.type !== "expense") continue;
      if (tx.currencyCode !== currencyCode) continue;
      if (range && (tx.date < range.start || tx.date > range.end)) continue;

      const existing = totals.get(tx.categoryName);
      if (existing) {
        existing.total += tx.amount;
      } else {
        totals.set(tx.categoryName, { icon: tx.categoryIcon, total: tx.amount });
      }
    }

    return Array.from(totals.entries())
      .map(([name, { icon, total }]) => ({
        name,
        icon,
        total,
        color: colorForCategoryIndex(categoryIndexByName.get(name) ?? -1),
      }))
      .sort((a, b) => b.total - a.total);
  }, [transactions, periodType, anchorISO, currencyCode, categoryIndexByName]);

  const maxTotal = bars.length > 0 ? bars[0].total : 0;
  const grandTotal = bars.reduce((sum, b) => sum + b.total, 0);
  const symbol = getCurrency(currencyCode)?.symbol ?? currencyCode;

  return (
    <div className="settings-view">
      <header className="settings-header">
        <h1>Spending by category</h1>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
      </header>

      <div className="chart-controls">
        <div className="period-type-tabs">
          {PERIOD_TYPES.map((p) => (
            <button
              key={p.value}
              type="button"
              className={p.value === periodType ? "period-tab period-tab-active" : "period-tab"}
              onClick={() => setPeriodType(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="chart-subcontrols">
          <div className="period-nav">
            <button onClick={() => handleShiftAnchor("prev")} aria-label="Previous period">‹</button>
            <span>{formatPeriodLabel(periodType, anchorISO)}</span>
            <button onClick={() => handleShiftAnchor("next")} aria-label="Next period">›</button>
          </div>

          {activeCurrencyCodes.length > 1 && (
            <select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)}>
              {activeCurrencyCodes.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {bars.length === 0 ? (
        <p className="empty-state">No spending in this period.</p>
      ) : (
        <>
          <p className="chart-total">
            Total spent: <strong>{symbol}{grandTotal.toFixed(2)}</strong>
          </p>
          <div className="bar-chart">
            {bars.map((b) => {
              const pct = grandTotal > 0 ? Math.round((b.total / grandTotal) * 100) : 0;
              return (
                <div key={b.name} className="bar-row">
                  <div className="bar-row-top">
                    <span className="bar-row-label">
                      <Icon name={b.icon} style={{ color: b.color }} />
                      <span>{b.name}</span>
                    </span>
                    <span className="bar-row-right">
                      <span className="bar-row-amount">{symbol}{b.total.toFixed(2)}</span>
                      <span className="bar-row-pct">{pct}%</span>
                    </span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${maxTotal > 0 ? (b.total / maxTotal) * 100 : 0}%`, background: b.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
