const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function below1000(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : ""));
  else if (n > 0) parts.push(ONES[n]);
  return parts.join(" ");
}

function integerToWords(n: number): string {
  if (n === 0) return "Zero";
  const units: [number, string][] = [
    [10000000, "Crore"],
    [100000, "Lakh"],
    [1000, "Thousand"],
  ];
  const parts: string[] = [];
  for (const [size, label] of units) {
    if (n >= size) {
      parts.push(`${below1000(Math.floor(n / size))} ${label}`);
      n %= size;
    }
  }
  if (n > 0) parts.push(below1000(n));
  return parts.join(" ");
}

// Takes a decimal string ("12345.60") so money never passes through a float.
export function amountInWords(amount: string): string {
  const [rupeeStr, paiseRaw = ""] = amount.split(".");
  const rupees = Number(rupeeStr);
  const paise = Number(paiseRaw.padEnd(2, "0").slice(0, 2));
  let words = `Rupees ${integerToWords(rupees)}`;
  if (paise > 0) words += ` and ${integerToWords(paise)} Paise`;
  return `${words} Only`;
}
