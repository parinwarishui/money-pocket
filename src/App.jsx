import { useMemo, useState } from "react";
import "./App.css";
import { useApp } from "./context/AppContext.jsx";
import { getCurrency } from "./data/currencies.js";
import TransactionList from "./components/TransactionList.jsx";
import TransactionForm from "./components/TransactionForm.jsx";
import AddMoneyForm from "./components/AddMoneyForm.jsx";
import FilterBar from "./components/FilterBar.jsx";
import SettingsView from "./components/SettingsView.jsx";
import Icon from "./components/Icon.jsx";
import { getPeriodRange, shiftAnchor, todayISO } from "./utils/dateUtils.js";

export default function App() {
  const { transactions, categories, activeCurrencyCodes, balancesByCurrency, deleteTransaction } =
    useApp();

  const [view, setView] = useState("list"); // "list" | "settings"
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [periodType, setPeriodType] = useState("all");
  const [anchorISO, setAnchorISO] = useState(todayISO());

  function openAddForm() {
    setEditingTransaction(null);
    setIsFormOpen(true);
  }

  function openAddMoneyForm() {
    setEditingTransaction(null);
    setIsAddMoneyOpen(true);
  }

  function openEditForm(tx) {
    setEditingTransaction(tx);
    if (tx.type === "income") {
      setIsAddMoneyOpen(true);
    } else {
      setIsFormOpen(true);
    }
  }

  function closeModal() {
    setIsFormOpen(false);
    setIsAddMoneyOpen(false);
    setEditingTransaction(null);
  }

  function handleTypeFilterChange(value) {
    setTypeFilter(value);
    if (value === "income") setCategoryFilter("");
  }

  function handleShiftAnchor(direction) {
    setAnchorISO((prev) => shiftAnchor(periodType, prev, direction));
  }

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    if (typeFilter !== "all") {
      result = result.filter((tx) => tx.type === typeFilter);
    }

    if (categoryFilter) {
      result = result.filter((tx) => tx.categoryName === categoryFilter);
    }

    if (periodType !== "all") {
      const range = getPeriodRange(periodType, anchorISO);
      result = result.filter((tx) => tx.date >= range.start && tx.date <= range.end);
    }

    return result;
  }, [transactions, categoryFilter, typeFilter, periodType, anchorISO]);

  // Primary currency shown large; any others demoted to a smaller line
  // beneath it, in the order currencies were added.
  const currencyCodesWithBalance = activeCurrencyCodes.filter(
    (code) => code in balancesByCurrency,
  );

  if (view === "settings") {
    return <SettingsView onClose={() => setView("list")} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <img src="/favicon.svg" alt="" className="app-logo" />
          <h1>Money Pocket</h1>
        </div>
        <button className="icon-btn" onClick={() => setView("settings")} aria-label="Settings">
          <Icon name="settings" />
        </button>
      </header>

      <section className="balance-hero">
        {currencyCodesWithBalance.length > 0 ? (
          <>
            <div
              className={
                balancesByCurrency[currencyCodesWithBalance[0]] < 0
                  ? "balance-primary balance-negative"
                  : "balance-primary"
              }
            >
              {getCurrency(currencyCodesWithBalance[0])?.symbol ?? currencyCodesWithBalance[0]}
              {Math.abs(balancesByCurrency[currencyCodesWithBalance[0]]).toFixed(2)}
            </div>
            {currencyCodesWithBalance.length > 1 && (
              <div className="balance-secondary">
                {currencyCodesWithBalance.slice(1).map((code) => (
                  <span key={code} className={balancesByCurrency[code] < 0 ? "balance-negative" : ""}>
                    {getCurrency(code)?.symbol ?? code}
                    {Math.abs(balancesByCurrency[code]).toFixed(2)}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="balance-primary balance-empty">Add your first transaction</div>
        )}
        <button className="add-money-btn" onClick={openAddMoneyForm}>
          + Add money
        </button>
      </section>

      <FilterBar
        categories={categories}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={handleTypeFilterChange}
        periodType={periodType}
        onPeriodTypeChange={setPeriodType}
        anchorISO={anchorISO}
        onShiftAnchor={handleShiftAnchor}
      />

      <TransactionList
        transactions={filteredTransactions}
        onEdit={openEditForm}
        onDelete={deleteTransaction}
      />

      <button className="fab" onClick={openAddForm} aria-label="Add transaction">+</button>

      {isFormOpen && (
        <TransactionForm editingTransaction={editingTransaction} onClose={closeModal} />
      )}
      {isAddMoneyOpen && (
        <AddMoneyForm editingTransaction={editingTransaction} onClose={closeModal} />
      )}
    </div>
  );
}
