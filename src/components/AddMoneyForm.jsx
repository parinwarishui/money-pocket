import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { todayISO } from "../utils/dateUtils.js";

export default function AddMoneyForm({ editingTransaction, onClose }) {
  const {
    incomeCategories,
    activeCurrencyCodes,
    lastUsedCurrencyCode,
    addIncomeTransaction,
    updateIncomeTransaction,
  } = useApp();

  const isEditing = Boolean(editingTransaction);

  const [date, setDate] = useState(editingTransaction?.date ?? todayISO());
  // A transaction added before income categories existed (or imported
  // from an old backup) has a categoryName that won't match any of
  // these — fall back to the first category rather than leaving the
  // picker on a value with no matching option.
  const [categoryName, setCategoryName] = useState(() => {
    const existing = editingTransaction?.categoryName;
    if (existing && incomeCategories.some((c) => c.name === existing)) return existing;
    return incomeCategories[0]?.name ?? "";
  });
  const [amount, setAmount] = useState(
    editingTransaction ? String(editingTransaction.amount) : "",
  );
  const [currencyCode, setCurrencyCode] = useState(
    editingTransaction?.currencyCode ?? lastUsedCurrencyCode,
  );
  const [note, setNote] = useState(editingTransaction?.note ?? "");

  function handleSubmit(e) {
    e.preventDefault();
    const category = incomeCategories.find((c) => c.name === categoryName);
    if (!category || !amount) return;
    const parsedAmount = Math.round(parseFloat(amount) * 100) / 100;

    if (isEditing) {
      updateIncomeTransaction(editingTransaction.id, {
        date,
        category,
        amount: parsedAmount,
        currencyCode,
        note,
      });
    } else {
      addIncomeTransaction({ date, category, amount: parsedAmount, currencyCode, note });
    }
    onClose();
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{isEditing ? "Edit money added" : "Add money"}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>

          <label>
            Category
            <select value={categoryName} onChange={(e) => setCategoryName(e.target.value)}>
              {incomeCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Amount
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>

          <label>
            Currency
            <select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)}>
              {activeCurrencyCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>

          <label>
            Note (optional)
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>

          <div className="sheet-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">{isEditing ? "Save" : "Add money"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
