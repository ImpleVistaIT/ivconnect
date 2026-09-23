// Chart accent colors and avatar-background twins, ported from the reference.
export const C1 = "#2FB8A4";
export const C2 = "#A552C6";
export const C3 = "#C98A0E";
export const C4 = "#5FD0BC";
export const C5 = "#7A1E9C";
export const C6 = "#C4324B";

const D1 = "#137A6C", D2 = "#7A1E9C", D3 = "#8A5A00", D4 = "#0F6E62", D5 = "#5A0D78", D6 = "#9A2438";
const DK: Record<string, string> = { [C1]: D1, [C2]: D2, [C3]: D3, [C4]: D4, [C5]: D5, [C6]: D6 };

export function avatarColor(c: string): string {
  return DK[c] ?? c;
}
