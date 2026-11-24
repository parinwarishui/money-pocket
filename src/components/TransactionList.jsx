import { getCurrency } from "../data/currencies.js";
import { formatDayHeading } from "../utils/dateUtils.js";
import { groupTransactionsByDay } from "../utils/groupTransactions.js";
import Icon from "./Icon.jsx";

export default function TransactionList({ transactions, onEdit, onDelete }) {
  if (transactions.length === 0) {
    return <p className="empty-state">No transactions in this view yet.</p>;
  }

  const groups = groupTransactionsByDay(transactions);

  return (
    <div className="transaction-list">
      {groups.map((group) => {
        // Net (income minus spending) per currency for this day.
        const subtotalsByCurrency = {};
        for (const tx of group.items) {
          const signed = tx.type === "income" ? tx.amount : -tx.amount;
          subtotalsByCurrency[tx.currencyCode] = (subtotalsByCurrency[tx.currencyCode] || 0) + signed;
        }

        return (
          <div key={group.date} className="day-group">
            <div className="day-heading">
              <span>{formatDayHeading(group.date)}</span>
              <span className="day-subtotal">
                {Object.entries(subtotalsByCurrency).map(([code, total]) => {
                  const sign = total >= 0 ? "+" : "-";
                  const symbol = getCurrency(code)?.symbol ?? code;
                  return (
                    <span key={code} className="day-subtotal-item">
                      {sign}
                      {symbol}
                      {Math.abs(total).toFixed(2)}
                    </span>
                  );
                })}
              </span>
            </div>
            <ul>
              {group.items.map((tx) => (
                <li key={tx.id} className="transaction-row">
                  <button className="transaction-main" onClick={() => onEdit(tx)}>
                    <span className="transaction-text">
                      {tx.note ? (
                        <>
                          <span className="tx-title">{tx.note}</span>
                          <span className="tx-subtitle">
                            <Icon name={tx.categoryIcon} className="tx-icon" />
                            {tx.categoryName}
                          </span>
                        </>
                      ) : (
                        <span className="tx-title tx-title-with-icon">
                          <Icon name={tx.categoryIcon} className="tx-icon" />
                          {tx.categoryName}
                        </span>
                      )}
                    </span>
                    <span className={tx.type === "income" ? "amount amount-income" : "amount amount-expense"}>
                      {tx.type === "income" ? "+" : "-"}
                      {getCurrency(tx.currencyCode)?.symbol ?? tx.currencyCode}
                      {tx.amount.toFixed(2)}
                    </span>
                  </button>
                  <button className="delete-btn" onClick={() => onDelete(tx.id)} aria-label="Delete transaction">
                    <Icon name="close" />
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
