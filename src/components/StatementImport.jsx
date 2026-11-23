import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { readCsvRows, detectColumns, normalizeRows } from "../utils/csvImport.js";
import { categorizeTransactions } from "../utils/llmCategorize.js";

function isLikelyDuplicate(row, transactions) {
  return transactions.some(
    (tx) =>
      tx.date === row.date &&
      Math.abs(tx.amount - row.amount) < 0.01 &&
      tx.note.trim().toLowerCase() === row.description.trim().toLowerCase(),
  );
}

export default function StatementImport({ onClose }) {
  const {
    categories,
    activeCurrencyCodes,
    lastUsedCurrencyCode,
    transactions,
    importStatementTransactions,
  } = useApp();

  const [step, setStep] = useState("upload");
  const [currencyCode, setCurrencyCode] = useState(lastUsedCurrencyCode);
  const [rawRows, setRawRows] = useState(null);
  const [columnMap, setColumnMap] = useState(null);
  const [useSplitDebitCredit, setUseSplitDebitCredit] = useState(false);
  const [rows, setRows] = useState([]);
  const [categorizeError, setCategorizeError] = useState(null);
  const [fileError, setFileError] = useState(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    try {
      const parsedRaw = await readCsvRows(file);
      if (parsedRaw.length < 2) {
        setFileError("That file doesn't look like it has any transaction rows.");
        return;
      }
      const detected = detectColumns(parsedRaw[0]);
      setRawRows(parsedRaw);
      setColumnMap(detected);
      setUseSplitDebitCredit(detected.amount === -1 && (detected.debit !== -1 || detected.credit !== -1));
      setStep("mapping");
    } catch (err) {
      setFileError("Could not read that file: " + err.message);
    }
  }

  const mappingValid =
    columnMap &&
    columnMap.date !== -1 &&
    (useSplitDebitCredit
      ? columnMap.debit !== -1 || columnMap.credit !== -1
      : columnMap.amount !== -1);

  function handleConfirmMapping() {
    const normalized = normalizeRows(rawRows, columnMap).map((row) => {
      const dup = isLikelyDuplicate(row, transactions);
      return { ...row, isDuplicate: dup, include: row.direction === "out" && !dup, categoryName: null };
    });
    setRows(normalized);
    setStep("categorizing");
    runCategorize(normalized);
  }

  async function runCategorize(normalized) {
    const toSend = normalized.filter((r) => r.include);
    if (toSend.length === 0) {
      setStep("review");
      return;
    }
    const categoryNames = categories.map((c) => c.name);
    const { items, error } = await categorizeTransactions(toSend, categoryNames);
    const byId = new Map(items.map((it) => [it.rowId, it.categoryName]));
    setRows((prev) =>
      prev.map((row) => (byId.has(row.rowId) ? { ...row, categoryName: byId.get(row.rowId) } : row)),
    );
    setCategorizeError(error);
    setStep("review");
  }

  function updateRow(rowId, patch) {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }

  function handleSave() {
    const toSave = rows
      .filter((r) => r.include)
      .map((r) => ({
        date: r.date,
        description: r.description,
        amount: r.amount,
        currencyCode,
        categoryName: r.categoryName || categories[0].name,
      }));
    importStatementTransactions(toSave);
    onClose();
  }

  const includedCount = rows.filter((r) => r.include).length;

  return (
    <div className="sheet-overlay">
      <div className="sheet import-sheet">
        <h2>Import bank statement</h2>

        {step === "upload" && (
          <div className="import-step">
            <label>
              Statement currency
              <select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)}>
                {activeCurrencyCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
            <label>
              CSV file
              <input type="file" accept=".csv" onChange={handleFileChange} />
            </label>
            {fileError && <p className="error-text">{fileError}</p>}
            <p className="hint-text">
              Export your transaction history from your bank as a CSV, then pick it here. Only
              outgoing transactions are checked for import by default — incoming ones (deposits,
              refunds, salary) stay unchecked in the review step below.
            </p>
            <div className="sheet-actions">
              <button onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}

        {step === "mapping" && columnMap && (
          <div className="import-step">
            <p className="hint-text">Check the column guesses below ({rawRows.length - 1} rows found):</p>
            <label>
              Date column
              <select
                value={columnMap.date}
                onChange={(e) => setColumnMap({ ...columnMap, date: Number(e.target.value) })}
              >
                <option value={-1}>— none —</option>
                {rawRows[0].map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Column ${i + 1}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Description column
              <select
                value={columnMap.description}
                onChange={(e) => setColumnMap({ ...columnMap, description: Number(e.target.value) })}
              >
                <option value={-1}>— none —</option>
                {rawRows[0].map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Column ${i + 1}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useSplitDebitCredit}
                onChange={(e) => setUseSplitDebitCredit(e.target.checked)}
              />
              My statement has separate debit/credit columns instead of one signed amount
            </label>

            {!useSplitDebitCredit ? (
              <label>
                Amount column (negative = money out)
                <select
                  value={columnMap.amount}
                  onChange={(e) => setColumnMap({ ...columnMap, amount: Number(e.target.value) })}
                >
                  <option value={-1}>— none —</option>
                  {rawRows[0].map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label>
                  Debit / withdrawal column
                  <select
                    value={columnMap.debit}
                    onChange={(e) =>
                      setColumnMap({ ...columnMap, debit: Number(e.target.value), amount: -1 })
                    }
                  >
                    <option value={-1}>— none —</option>
                    {rawRows[0].map((h, i) => (
                      <option key={i} value={i}>
                        {h || `Column ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Credit / deposit column
                  <select
                    value={columnMap.credit}
                    onChange={(e) =>
                      setColumnMap({ ...columnMap, credit: Number(e.target.value), amount: -1 })
                    }
                  >
                    <option value={-1}>— none —</option>
                    {rawRows[0].map((h, i) => (
                      <option key={i} value={i}>
                        {h || `Column ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <div className="sheet-actions">
              <button onClick={() => setStep("upload")}>Back</button>
              <button onClick={handleConfirmMapping} disabled={!mappingValid}>
                Categorize with AI
              </button>
            </div>
          </div>
        )}

        {step === "categorizing" && (
          <p className="hint-text">
            Asking Claude to categorize {rows.filter((r) => r.include).length} transactions…
          </p>
        )}

        {step === "review" && (
          <div className="import-step">
            {categorizeError && (
              <p className="error-text">
                AI categorization failed ({categorizeError}) — everything below defaulted to the
                first category. Fix any of them by hand before saving.
              </p>
            )}
            <p className="hint-text">
              {includedCount} of {rows.length} rows will be imported. Unchecked rows (incoming
              money, or likely duplicates) are skipped.
            </p>
            <ul className="import-review-list">
              {rows.map((row) => (
                <li key={row.rowId} className={!row.include ? "import-row-excluded" : ""}>
                  <div className="import-row-top">
                    <input
                      type="checkbox"
                      checked={row.include}
                      onChange={(e) => updateRow(row.rowId, { include: e.target.checked })}
                    />
                    <span className="import-row-date">{row.date}</span>
                    <span className="import-row-amount">
                      {row.direction === "in" ? "+" : "-"}
                      {row.amount.toFixed(2)} {currencyCode}
                    </span>
                  </div>
                  <div className="import-row-desc">
                    {row.description || "(no description)"}
                    {row.isDuplicate && <span className="import-dup-badge">possible duplicate</span>}
                    {row.direction === "in" && <span className="import-dup-badge">incoming</span>}
                  </div>
                  <select
                    value={row.categoryName || categories[0].name}
                    onChange={(e) => updateRow(row.rowId, { categoryName: e.target.value })}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.emoji} {c.name}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
            <div className="sheet-actions">
              <button onClick={onClose}>Cancel</button>
              <button onClick={handleSave} disabled={includedCount === 0}>
                Save {includedCount} transaction{includedCount === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
