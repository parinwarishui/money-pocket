import { useRef, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import CategoryManager from "./CategoryManager.jsx";
import CurrencyManager from "./CurrencyManager.jsx";
import { exportToXlsx, importFromXlsxFile } from "../utils/exportImport.js";

const RESET_CONFIRM_WORD = "DELETE";

export default function SettingsView({ onClose }) {
  const { transactions, categories, mergeImportedData, resetAllData } = useApp();
  const { user, signOut } = useAuth();
  const fileInputRef = useRef(null);
  // Off by default: a row whose id already exists is left alone unless
  // the user deliberately opts in to letting the file overwrite it.
  const [overwriteOnImport, setOverwriteOnImport] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  function handleExport() {
    exportToXlsx(transactions, categories);
  }

  async function handleImportChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importFromXlsxFile(file);
      await mergeImportedData(imported, { overwrite: overwriteOnImport });
      alert("Import complete.");
    } catch (err) {
      alert("Could not read that file: " + err.message);
    } finally {
      e.target.value = "";
    }
  }

  function cancelReset() {
    setShowResetConfirm(false);
    setResetConfirmText("");
  }

  async function handleReset() {
    if (resetConfirmText !== RESET_CONFIRM_WORD) return;
    setResetting(true);
    try {
      await resetAllData();
      cancelReset();
      alert("All data has been deleted.");
    } catch (err) {
      alert("Couldn't reset: " + err.message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="settings-view">
      <div className="settings-header">
        <h1>Settings</h1>
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
      </div>

      <section className="manager-section">
        <h2>Account</h2>
        <p className="account-email">{user.displayName || user.email}</p>
        <button className="btn btn-outline" onClick={signOut}>Sign out</button>
      </section>

      <section className="manager-section">
        <h2>Backup</h2>
        <p className="section-hint">
          Your data syncs automatically through your Google account. Export/import is for
          moving data between accounts or keeping an offline copy.
        </p>
        <div className="button-row">
          <button className="btn btn-outline" onClick={handleExport}>Export to Excel</button>
          <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
            Import from Excel
          </button>
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={overwriteOnImport}
            onChange={(e) => setOverwriteOnImport(e.target.checked)}
          />
          <span>
            Overwrite rows that already exist
            <small>
              A row in the file with the same ID as one you already have will replace it
              instead of being skipped. Leave this off to only add rows you don't have yet.
            </small>
          </span>
        </label>
        <input
          type="file"
          accept=".xlsx"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleImportChange}
        />
      </section>

      <CategoryManager />
      <CurrencyManager />

      <section className="manager-section danger-zone">
        <h2>Danger Zone</h2>
        {!showResetConfirm ? (
          <>
            <p className="section-hint">
              Permanently delete every transaction and category in this account and start
              over empty. This cannot be undone — export a backup first if you might want
              this data again.
            </p>
            <button className="btn btn-danger" onClick={() => setShowResetConfirm(true)}>
              Reset all data
            </button>
          </>
        ) : (
          <div className="reset-confirm">
            <p className="section-hint">
              This will permanently delete all {transactions.length} transaction
              {transactions.length === 1 ? "" : "s"} and all {categories.length} categor
              {categories.length === 1 ? "y" : "ies"} — there's no undo. Type{" "}
              <strong>{RESET_CONFIRM_WORD}</strong> to confirm.
            </p>
            <input
              type="text"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder={`Type ${RESET_CONFIRM_WORD}`}
              autoCapitalize="characters"
              autoComplete="off"
            />
            <div className="button-row">
              <button
                className="btn btn-danger"
                disabled={resetConfirmText !== RESET_CONFIRM_WORD || resetting}
                onClick={handleReset}
              >
                {resetting ? "Deleting…" : "Yes, delete everything"}
              </button>
              <button className="btn btn-outline" onClick={cancelReset} disabled={resetting}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
