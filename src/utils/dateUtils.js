export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Returns { start, end } ISO strings (inclusive) for the calendar period
// containing `anchorISO`, for periodType "week" | "month" | "year".
export function getPeriodRange(periodType, anchorISO) {
  const anchor = parseISO(anchorISO);

  if (periodType === "week") {
    const day = anchor.getDay(); // 0 = Sunday
    const diffToMonday = (day + 6) % 7;
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: toISO(start), end: toISO(end) };
  }

  if (periodType === "month") {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return { start: toISO(start), end: toISO(end) };
  }

  if (periodType === "year") {
    const start = new Date(anchor.getFullYear(), 0, 1);
    const end = new Date(anchor.getFullYear(), 11, 31);
    return { start: toISO(start), end: toISO(end) };
  }

  return null; // "all" — no range
}

export function shiftAnchor(periodType, anchorISO, direction) {
  const anchor = parseISO(anchorISO);
  const sign = direction === "next" ? 1 : -1;

  if (periodType === "week") anchor.setDate(anchor.getDate() + 7 * sign);
  else if (periodType === "month") anchor.setMonth(anchor.getMonth() + sign);
  else if (periodType === "year") anchor.setFullYear(anchor.getFullYear() + sign);

  return toISO(anchor);
}

function formatShort(date) {
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function formatPeriodLabel(periodType, anchorISO) {
  const anchor = parseISO(anchorISO);
  if (periodType === "week") {
    const { start, end } = getPeriodRange("week", anchorISO);
    return `${formatShort(parseISO(start))} – ${formatShort(parseISO(end))}`;
  }
  if (periodType === "month") {
    return anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  if (periodType === "year") {
    return String(anchor.getFullYear());
  }
  return "All time";
}

export function formatDayHeading(iso) {
  const date = parseISO(iso);
  const todayDate = new Date();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(todayDate.getDate() - 1);

  if (iso === toISO(todayDate)) return "Today";
  if (iso === toISO(yesterdayDate)) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
