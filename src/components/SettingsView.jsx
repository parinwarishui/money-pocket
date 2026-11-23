import { useRef } from "react";
import { useApp } from "../context/AppContext.jsx";
import CategoryManager from "./CategoryManager.jsx";
import CurrencyManager from "./CurrencyManager.jsx";
import { exportToXlsx, importFromXlsxFile } from "../utils/exportImport.js";

export default function SettingsView({ onClose }) {
  const { transactions, categories, mergeImportedData } = useApp();
  const fileInputRef = useRef(null);

  function handleExport() {
    exportToXlsx(transactions, categories);
  }

  async function handleImportChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importFromXlsxFile(file);
      mergeImportedData(imported);
      alert("Import complete.");
    } catch (err) {
      alert("Could not read that file: " + err.message);
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="settings-view">
      <div className="settings-header">
        <h1>Settings</h1>
        <button onClick={onClose}>Close</button>
      </div>

      <section className="manager-section">
        <h2>Backup</h2>
        <button onClick={handleExport}>Export to Excel</button>
        <button onClick={() => fileInputRef.current?.click()}>Import from Excel</button>
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
    </div>
  );
}
