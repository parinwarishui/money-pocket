import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase.js";
import { useAuth } from "./AuthContext.jsx";
import { DEFAULT_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "../data/categories.js";
import { iconForName, DEFAULT_ICON } from "../data/icons.js";
import { sortByDateDesc } from "../utils/sortTransactions.js";

const DEFAULT_SETTINGS = {
  activeCurrencyCodes: ["SGD"],
  lastUsedCurrencyCode: "SGD",
};

const AppContext = createContext(null);

// Data lives in Firestore under users/{uid}: a settings doc plus
// transactions/categories subcollections. AppProvider is only ever
// mounted once signed in (see Root.jsx), so `user` here is always a
// real account — there's no "logged out" state to handle inside it.
export function AppProvider({ children }) {
  const { user } = useAuth();
  const uid = user.uid;

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  const txCollection = useMemo(() => collection(db, "users", uid, "transactions"), [uid]);
  const catCollection = useMemo(() => collection(db, "users", uid, "categories"), [uid]);
  const settingsRef = useMemo(() => doc(db, "users", uid), [uid]);

  // A brand-new account has no settings doc yet — seed it with the
  // default expense AND income categories exactly once. A returning
  // account that predates income categories gets backfilled instead:
  // any category written before the `type` field existed is assumed to
  // be an expense category (that's all there used to be), and the
  // income starter set is added if it doesn't have one yet. Either way
  // this never touches a category the user has actually edited.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [settingsSnap, catsSnap] = await Promise.all([getDoc(settingsRef), getDocs(catCollection)]);
      if (cancelled) return;

      const batch = writeBatch(db);
      let needsCommit = false;

      if (!settingsSnap.exists()) {
        batch.set(settingsRef, DEFAULT_SETTINGS);
        needsCommit = true;
      }

      if (catsSnap.docs.length === 0) {
        for (const c of DEFAULT_CATEGORIES) {
          batch.set(doc(catCollection, c.id), { icon: c.icon, name: c.name, type: "expense" });
        }
        for (const c of DEFAULT_INCOME_CATEGORIES) {
          batch.set(doc(catCollection, c.id), { icon: c.icon, name: c.name, type: "income" });
        }
        needsCommit = true;
      } else {
        let hasIncomeCategory = false;
        for (const d of catsSnap.docs) {
          const data = d.data();
          if (data.type === "income") hasIncomeCategory = true;
          if (!data.type) {
            batch.update(doc(catCollection, d.id), { type: "expense" });
            needsCommit = true;
          }
        }
        if (!hasIncomeCategory) {
          for (const c of DEFAULT_INCOME_CATEGORIES) {
            batch.set(doc(catCollection, c.id), { icon: c.icon, name: c.name, type: "income" });
          }
          needsCommit = true;
        }
      }

      if (needsCommit) await batch.commit();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    return onSnapshot(txCollection, (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [txCollection]);

  useEffect(() => {
    return onSnapshot(catCollection, (snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [catCollection]);

  useEffect(() => {
    return onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) setSettings(snap.data());
    });
  }, [settingsRef]);

  // ----- transactions: spending -----

  function addTransaction({ date, category, amount, currencyCode, note }) {
    setDoc(doc(txCollection, crypto.randomUUID()), {
      date,
      type: "expense",
      categoryIcon: category.icon,
      categoryName: category.name,
      amount,
      currencyCode,
      note: note || "",
      createdAt: Date.now(),
    });
    updateDoc(settingsRef, { lastUsedCurrencyCode: currencyCode });
  }

  function updateTransaction(id, { date, category, amount, currencyCode, note }) {
    updateDoc(doc(txCollection, id), {
      date,
      type: "expense",
      categoryIcon: category.icon,
      categoryName: category.name,
      amount,
      currencyCode,
      note: note || "",
    });
    updateDoc(settingsRef, { lastUsedCurrencyCode: currencyCode });
  }

  function deleteTransaction(id) {
    deleteDoc(doc(txCollection, id));
  }

  // ----- transactions: income -----

  function addIncomeTransaction({ date, category, amount, currencyCode, note }) {
    setDoc(doc(txCollection, crypto.randomUUID()), {
      date,
      type: "income",
      categoryIcon: category.icon,
      categoryName: category.name,
      amount,
      currencyCode,
      note: note || "",
      createdAt: Date.now(),
    });
    updateDoc(settingsRef, { lastUsedCurrencyCode: currencyCode });
  }

  function updateIncomeTransaction(id, { date, category, amount, currencyCode, note }) {
    updateDoc(doc(txCollection, id), {
      date,
      type: "income",
      categoryIcon: category.icon,
      categoryName: category.name,
      amount,
      currencyCode,
      note: note || "",
    });
    updateDoc(settingsRef, { lastUsedCurrencyCode: currencyCode });
  }

  // ----- categories -----

  function addCategory({ icon, name, type = "expense" }) {
    setDoc(doc(catCollection, crypto.randomUUID()), { icon, name, type });
  }

  function updateCategory(id, { icon, name }) {
    updateDoc(doc(catCollection, id), { icon, name });
  }

  function deleteCategory(id) {
    // Safe to delete unconditionally: transactions snapshot their
    // category's icon/name at creation time, so nothing else depends on
    // this category still existing.
    deleteDoc(doc(catCollection, id));
  }

  // ----- currencies (append-only: codes never change or get removed) -----

  function addCurrency(code) {
    updateDoc(settingsRef, { activeCurrencyCodes: arrayUnion(code) });
  }

  // ----- import (merge by id; by default local always wins, matching
  // rows are left untouched — pass { overwrite: true } to instead let
  // the imported file replace them) -----

  async function mergeImportedData(
    { transactions: importedTx, categories: importedCats },
    { overwrite = false } = {}
  ) {
    const existingTxIds = new Set(transactions.map((t) => t.id));
    const existingCatIds = new Set(categories.map((c) => c.id));

    const batch = writeBatch(db);
    let writes = 0;

    for (const t of importedTx) {
      const isExisting = existingTxIds.has(t.id);
      if (isExisting && !overwrite) continue;
      const withType = t.type ? t : { ...t, type: "expense" };
      const withIcon = withType.categoryIcon
        ? withType
        : { ...withType, categoryIcon: iconForName(withType.categoryName) || DEFAULT_ICON };
      const { id, ...data } = withIcon;
      batch.set(doc(txCollection, id), { createdAt: Date.now(), ...data });
      writes++;
    }

    for (const c of importedCats || []) {
      const isExisting = existingCatIds.has(c.id);
      if (isExisting && !overwrite) continue;
      const withType = c.type ? c : { ...c, type: "expense" };
      const withIcon = withType.icon ? withType : { ...withType, icon: iconForName(withType.name) || DEFAULT_ICON };
      const { id, ...data } = withIcon;
      batch.set(doc(catCollection, id), data);
      writes++;
    }

    if (writes > 0) await batch.commit();
  }

  // ----- reset (delete everything, then reseed like a brand-new account) -----

  // Firestore batches cap out at 500 writes, so a reset on an account
  // with a lot of history is split across as many batches as needed.
  async function commitInChunks(ops) {
    const CHUNK_SIZE = 450;
    for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
      const batch = writeBatch(db);
      for (const op of ops.slice(i, i + CHUNK_SIZE)) {
        if (op.type === "delete") batch.delete(op.ref);
        else batch.set(op.ref, op.data);
      }
      await batch.commit();
    }
  }

  async function resetAllData() {
    const ops = [
      ...transactions.map((t) => ({ type: "delete", ref: doc(txCollection, t.id) })),
      ...categories.map((c) => ({ type: "delete", ref: doc(catCollection, c.id) })),
      ...DEFAULT_CATEGORIES.map((c) => ({
        type: "set",
        ref: doc(catCollection, c.id),
        data: { icon: c.icon, name: c.name, type: "expense" },
      })),
      ...DEFAULT_INCOME_CATEGORIES.map((c) => ({
        type: "set",
        ref: doc(catCollection, c.id),
        data: { icon: c.icon, name: c.name, type: "income" },
      })),
      { type: "set", ref: settingsRef, data: DEFAULT_SETTINGS },
    ];
    await commitInChunks(ops);
  }

  // ----- computed -----

  // Every consumer (list, charts, filters) reads transactions through
  // this, so date order is guaranteed app-wide no matter what order
  // Firestore's snapshot delivers documents in.
  const sortedTransactions = useMemo(() => sortByDateDesc(transactions), [transactions]);

  // Split by type for the two separate category pickers/managers. A
  // category missing `type` (shouldn't happen once migration has run,
  // but the snapshot listener can in principle race ahead of it) is
  // treated as an expense category, matching what it always meant
  // before income categories existed.
  const expenseCategories = useMemo(() => categories.filter((c) => c.type !== "income"), [categories]);
  const incomeCategories = useMemo(() => categories.filter((c) => c.type === "income"), [categories]);

  // Running balance per currency (income minus spending, always
  // all-time, never affected by the list's filters).
  const balancesByCurrency = useMemo(() => {
    const totals = {};
    for (const tx of transactions) {
      const signed = tx.type === "income" ? tx.amount : -tx.amount;
      totals[tx.currencyCode] = (totals[tx.currencyCode] || 0) + signed;
    }
    return totals;
  }, [transactions]);

  if (!ready) {
    return <div className="auth-loading">Setting up your account…</div>;
  }

  const value = {
    transactions: sortedTransactions,
    categories,
    expenseCategories,
    incomeCategories,
    activeCurrencyCodes: settings.activeCurrencyCodes,
    lastUsedCurrencyCode: settings.lastUsedCurrencyCode,
    balancesByCurrency,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addIncomeTransaction,
    updateIncomeTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    addCurrency,
    mergeImportedData,
    resetAllData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
