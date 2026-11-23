import * as XLSX from "xlsx";

export function exportToXlsx(transactions, categories) {
  const txRows = transactions.map((t) => ({
    ID: t.id,
    Date: t.date,
    "Category Emoji": t.categoryEmoji,
    "Category Name": t.categoryName,
    Amount: t.amount,
    Currency: t.currencyCode,
    Note: t.note || "",
  }));

  const catRows = categories.map((c) => ({
    ID: c.id,
    Emoji: c.emoji,
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

        const transactions = txRows.map((row) => ({
          id: String(row.ID),
          date: String(row.Date),
          categoryEmoji: row["Category Emoji"] || "",
          categoryName: row["Category Name"] || "",
          amount: Number(row.Amount),
          currencyCode: row.Currency,
          note: row.Note || "",
        }));

        const categories = catRows.map((row) => ({
          id: String(row.ID),
          emoji: row.Emoji,
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
