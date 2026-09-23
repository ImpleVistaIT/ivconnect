// Pure functions: no DB or crypto dependency. Operate on already-decrypted values,
// right before a response is sent, when the caller isn't entitled to the full value.

// "ABCDE1234Z" -> "AXXXXX234Z": first char, X-filled middle, last 4 chars.
export function maskPan(fullPan: string): string {
  const p = fullPan.trim().toUpperCase();
  if (p.length <= 5) return "X".repeat(p.length);
  return `${p[0]}${"X".repeat(p.length - 5)}${p.slice(-4)}`;
}

// "123456789012" -> "XXXXXXXX9012": used where only the last-4 digits are stored
// (e.g. bank account numbers), not a full value to mask on the fly.
export function maskLast4(value: string | null | undefined): string | null {
  if (!value) return null;
  return `${"X".repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`;
}

// "+919812345647" -> "+91 98XXXXXX47": country code, first 2 local digits, X-filled
// middle, last 2 digits. Falls back to a plain X-fill for shapes that don't match
// "+<country><10 digits>".
export function maskPhone(fullPhone: string): string {
  const p = fullPhone.trim();
  const m = p.match(/^(\+\d{1,3})(\d{10})$/);
  if (!m) return p.length <= 4 ? "X".repeat(p.length) : `${"X".repeat(p.length - 4)}${p.slice(-4)}`;
  const [, cc, local] = m;
  return `${cc} ${local.slice(0, 2)}${"X".repeat(6)}${local.slice(-2)}`;
}
