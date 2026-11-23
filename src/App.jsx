import { useMemo, useState } from "react";
import "./App.css";
import { useApp } from "./context/AppContext.jsx";
import TransactionList from "./components/TransactionList.jsx";
import TransactionForm from "./components/TransactionForm.jsx";
import FilterBar from "./components/FilterBar.jsx";
import SettingsView from "./components/SettingsView.jsx";
import { getPeriodRange, shiftAnchor, todayISO } from "./utils/dateUtils.js";

export default function App() {
  const { transactions, categories, deleteTransaction } = useApp();

  const [view, setView] = useState("list"); // "list" | "settings"
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [periodType, setPeriodType] = useState("all");
  const [anchorISO, setAnchorISO] = useState(todayISO());

  function openAddForm() {
    setEditingTransaction(null);
    setIsFormOpen(true);
  }

  function openEditForm(tx) {
    setEditingTransaction(tx);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingTransaction(null);
  }

  function handleShiftAnchor(direction) {
    setAnchorISO((prev) => shiftAnchor(periodType, prev, direction));
  }

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    if (categoryFilter) {
      result = result.filter((tx) => tx.categoryName === categoryFilter);
    }

    if (periodType !== "all") {
      const range = getPeriodRange(periodType, anchorISO);
      result = result.filter((tx) => tx.date >= range.start && tx.date <= range.end);
    }

    return result;
  }, [transactions, categoryFilter, periodType, anchorISO]);

  if (view === "settings") {
    return <SettingsView onClose={() => setView("list")} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Money Pocket</h1>
        <button onClick={() => setView("settings")}>⚙️</button>
      </header>

      <FilterBar
        categories={categories}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
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
        <TransactionForm editingTransaction={editingTransaction} onClose={closeForm} />
      )}
    </div>
  );
}
