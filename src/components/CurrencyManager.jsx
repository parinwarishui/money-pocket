import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { CURRENCIES, getCurrency } from "../data/currencies.js";

export default function CurrencyManager() {
  const { activeCurrencyCodes, addCurrency } = useApp();
  const available = CURRENCIES.filter((c) => !activeCurrencyCodes.includes(c.code));
  const [selected, setSelected] = useState(available[0]?.code ?? "");

  return (
    <section className="manager-section">
      <h2>Currencies</h2>
      <ul className="manager-list">
        {activeCurrencyCodes.map((code) => {
          const currency = getCurrency(code);
          return (
            <li key={code}>
              {currency?.symbol} {currency?.name} ({code})
            </li>
          );
        })}
      </ul>

      {available.length > 0 && (
        <div className="manager-form currency-add-row">
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {available.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.name} ({c.code})
              </option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => addCurrency(selected)}>
            + Add currency
          </button>
        </div>
      )}
    </section>
  );
}
