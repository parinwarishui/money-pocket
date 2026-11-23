import { getCurrency } from "../data/currencies.js";
import { formatDayHeading } from "../utils/dateUtils.js";

export default function TransactionList({ transactions, onEdit, onDelete }) {
  if (transactions.length === 0) {
    return <p className="empty-state">No transactions in this view yet.</p>;
  }

  const groups = [];
  let currentGroup = null;
  for (const tx of transactions) {
    if (!currentGroup || currentGroup.date !== tx.date) {
      currentGroup = { date: tx.date, items: [] };
      groups.push(currentGroup);
    }
    currentGroup.items.push(tx);
  }

  return (
    <div className="transaction-list">
      {groups.map((group) => {
        const subtotalsByCurrency = {};
        for (const tx of group.items) {
          subtotalsByCurrency[tx.currencyCode] =
            (subtotalsByCurrency[tx.currencyCode] || 0) + tx.amount;
        }

        return (
          <div key={group.date} className="day-group">
            <div className="day-heading">
              <span>{formatDayHeading(group.date)}</span>
              <span className="day-subtotal">
                {Object.entries(subtotalsByCurrency)
                  .map(([code, total]) => `${getCurrency(code)?.symbol ?? code}${total.toFixed(2)}`)
                  .join(" + ")}
              </span>
            </div>
            <ul>
              {group.items.map((tx) => (
                <li key={tx.id} className="transaction-row">
                  <button className="transaction-main" onClick={() => onEdit(tx)}>
                    <span className="emoji">{tx.categoryEmoji}</span>
                    <span className="category-name">{tx.categoryName}</span>
                    {tx.note && <span className="note">— {tx.note}</span>}
                    <span className="amount">
                      {getCurrency(tx.currencyCode)?.symbol ?? tx.currencyCode}
                      {tx.amount.toFixed(2)}
                    </span>
                  </button>
                  <button className="delete-btn" onClick={() => onDelete(tx.id)} aria-label="Delete transaction">
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
