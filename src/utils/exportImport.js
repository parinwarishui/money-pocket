import * as XLSX from "xlsx";
import { iconForName, DEFAULT_ICON } from "../data/icons.js";

// Transactions and categories store a category *icon name* (e.g.
// "restaurant" — a Material Symbols ligature, see src/data/icons.js)
// rather than an emoji glyph. An icon name is a plain ASCII string, so
// it round-trips through xlsx with no encoding failure mode — unlike an
// emoji, which this reader's xlsx library can mangle for any character
// above the Basic Multilingual Plane.

export function exportToXlsx(transactions, categories) {
  const txRows = transactions.map((t) => ({
    ID: t.id,
    Date: t.date,
    Type: t.type === "income" ? "Income" : "Expense",
    "Category Icon": t.categoryIcon || iconForName(t.categoryName),
    "Category Name": t.categoryName,
    Amount: t.amount,
    Currency: t.currencyCode,
    Note: t.note || "",
  }));

  const catRows = categories.map((c) => ({
    ID: c.id,
    Icon: c.icon || iconForName(c.name),
    Name: c.name,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows), "Transactions");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(catRows), "Categories");

  const filename = `money-pocket-backup-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function importFromXlsxFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });

        const txSheet = wb.Sheets["Transactions"];
        const catSheet = wb.Sheets["Categories"];

        const txRows = txSheet ? XLSX.utils.sheet_to_json(txSheet) : [];
        const catRows = catSheet ? XLSX.utils.sheet_to_json(catSheet) : [];

        const transactions = txRows.map((row) => {
          const categoryName = row["Category Name"] || "";
          return {
            id: String(row.ID),
            date: String(row.Date),
            // Backups made before income existed have no Type column —
            // everything in them was spending.
            type: String(row.Type || "Expense").toLowerCase() === "income" ? "income" : "expense",
            // Old backups ("Category Emoji" column) are re-derived from
            // the category name rather than trusting the stored emoji,
            // which may already be mangled in that file.
            categoryIcon: row["Category Icon"] || iconForName(categoryName) || DEFAULT_ICON,
            categoryName,
            amount: Number(row.Amount),
            currencyCode: row.Currency,
            note: row.Note || "",
          };
        });

        const categories = catRows.map((row) => ({
          id: String(row.ID),
          icon: row.Icon || iconForName(row.Name) || DEFAULT_ICON,
          name: row.Name,
        }));

        resolve({ transactions, categories });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
