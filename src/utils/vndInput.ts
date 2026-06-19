/**
 * Định dạng nhập tiền VND: phân tách hàng nghìn bằng dấu chấm (1.000.000).
 * Dùng với Ant Design InputNumber `formatter` / `parser`.
 */

/** Chuỗi hiển thị trong ô nhập */
export function formatVndInput(value: string | number | undefined): string {
  if (value === '' || value === undefined || value === null) return '';
  const raw = String(value).replace(/\./g, '');
  if (raw === '' || raw === '-') return raw === '-' ? '-' : '';
  const n = Number(raw);
  if (!Number.isFinite(n)) return '';
  return Math.trunc(n).toLocaleString('vi-VN');
}

/** Chuỗi gửi vào InputNumber (chỉ số, không dấu phân cách) */
export function parseVndInput(displayValue: string | undefined): string {
  if (displayValue == null) return '';
  return displayValue.replace(/\./g, '');
}
