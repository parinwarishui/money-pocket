import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { todayISO } from "../utils/dateUtils.js";

export default function AddMoneyForm({ editingTransaction, onClose }) {
  const { activeCurrencyCodes, lastUsedCurrencyCode, addIncomeTransaction, updateIncomeTransaction } =
    useApp();

  const isEditing = Boolean(editingTransaction);

  const [date, setDate] = useState(editingTransaction?.date ?? todayISO());
  const [amount, setAmount] = useState(
    editingTransaction ? String(editingTransaction.amount) : "",
  );
  const [currencyCode, setCurrencyCode] = useState(
    editingTransaction?.currencyCode ?? lastUsedCurrencyCode,
  );
  const [note, setNote] = useState(editingTransaction?.note ?? "");

  function handleSubmit(e) {
    e.preventDefault();
    if (!amount) return;
    const parsedAmount = Math.round(parseFloat(amount) * 100) / 100;

    if (isEditing) {
      updateIncomeTransaction(editingTransaction.id, {
        date,
        amount: parsedAmount,
        currencyCode,
        note,
      });
    } else {
      addIncomeTransaction({ date, amount: parsedAmount, currencyCode, note });
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
