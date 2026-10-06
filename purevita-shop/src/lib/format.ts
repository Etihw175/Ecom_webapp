const thbFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

/** 1234 -> "฿1,234" */
export function formatTHB(amount: number): string {
  return `฿${thbFormatter.format(Math.round(amount))}`;
}

/** Thai date, Buddhist year, e.g. "6 ต.ค. 2569" (withTime: "6 ต.ค. 2569 10:30") */
export function formatDate(date: Date | string, withTime = false): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Asia/Bangkok",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, true);
}
