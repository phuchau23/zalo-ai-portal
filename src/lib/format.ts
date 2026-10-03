const money = new Intl.NumberFormat("vi-VN");
const dateTime = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

/** "450000" → "450.000 đ". Giá trống → "Liên hệ". */
export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Liên hệ";
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? `${money.format(n)} đ` : String(value);
}

/** Hiển thị giá trị một trường theo kiểu (money | number | text); null → "(trống)". */
export function formatFieldValue(fieldType: string, value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "(trống)";
  return fieldType === "money" ? formatMoney(value) : value;
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTime.format(new Date(iso)) : "";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
