import * as XLSX from "xlsx";

// Reads an uploaded CSV file into raw rows (array of arrays), header row included.
export function readCsvRows(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.onload = () => {
      try {
        const workbook = XLSX.read(reader.result, { type: "string", raw: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
        resolve(rows.filter((r) => r.some((cell) => String(cell).trim() !== "")));
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}

const KEYWORDS = {
  date: ["date"],
  description: [
    "description",
    "details",
    "particular",
    "narrative",
    "remark",
    "memo",
    "payee",
    "transaction",
  ],
  amount: ["amount", "value"],
  debit: ["debit", "withdrawal", "paid out", "money out", "dr"],
  credit: ["credit", "deposit", "paid in", "money in", "cr"],
};

// Guesses which column holds what. Returns -1 for anything not found —
// the UI lets the person fix a wrong guess before parsing for real.
export function detectColumns(headerRow) {
  const lower = headerRow.map((h) => String(h).toLowerCase());
  const find = (keywords) => {
    for (const kw of keywords) {
      const idx = lower.findIndex((h) => h.includes(kw));
      if (idx !== -1) return idx;
    }
    return -1;
  };
  return {
    date: find(KEYWORDS.date),
    description: find(KEYWORDS.description),
    amount: find(KEYWORDS.amount),
    debit: find(KEYWORDS.debit),
    credit: find(KEYWORDS.credit),
  };
}

function parseFlexibleDate(raw) {
  const s = String(raw).trim();

  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    let [, a, b, y] = m;
    a = Number(a);
    b = Number(b);
    // Ambiguous D/M vs M/D: if either slot is >12 it must be the day.
    // Otherwise default to DD/MM/YYYY.
    let day, month;
    if (a > 12) {
      day = a;
      month = b;
    } else if (b > 12) {
      day = b;
      month = a;
    } else {
      day = a;
      month = b;
    }
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

// Turns raw CSV rows + a confirmed column mapping into clean transaction
// candidates. Sign convention: negative = money out (spending), positive =
// money in. Rows that don't parse (bad date, no amount, zero amount) are
// dropped rather than guessed at.
export function normalizeRows(rawRows, columnMap) {
  const [, ...dataRows] = rawRows;
  return dataRows
    .map((row, index) => {
      const date = parseFlexibleDate(row[columnMap.date]);
      const description =
        columnMap.description !== -1 ? String(row[columnMap.description] ?? "").trim() : "";

      let signedAmount = null;
      if (columnMap.amount !== -1) {
        signedAmount = parseFloat(String(row[columnMap.amount]).replace(/[^0-9.-]/g, ""));
      } else {
        const debit =
          columnMap.debit !== -1
            ? parseFloat(String(row[columnMap.debit]).replace(/[^0-9.-]/g, "")) || 0
            : 0;
        const credit =
          columnMap.credit !== -1
            ? parseFloat(String(row[columnMap.credit]).replace(/[^0-9.-]/g, "")) || 0
            : 0;
        signedAmount = credit - debit;
      }

      if (date === null || signedAmount === null || Number.isNaN(signedAmount) || signedAmount === 0) {
        return null;
      }

      return {
        rowId: `row-${index}`,
        date,
        description,
        amount: Math.round(Math.abs(signedAmount) * 100) / 100,
        direction: signedAmount < 0 ? "out" : "in",
      };
    })
    .filter(Boolean);
}
