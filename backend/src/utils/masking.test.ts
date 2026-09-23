import { describe, expect, it } from "vitest";
import { maskPan, maskPhone, maskLast4 } from "./masking.js";
import { amountInWords } from "./amountInWords.js";

describe("maskPan", () => {
  it("matches the spec example exactly", () => {
    expect(maskPan("ABCDE1234Z")).toBe("AXXXXX234Z");
  });
  it("is case-insensitive on input", () => {
    expect(maskPan("abcde1234z")).toBe("AXXXXX234Z");
  });
});

describe("maskPhone", () => {
  it("matches the spec example exactly", () => {
    expect(maskPhone("+919812345647")).toBe("+91 98XXXXXX47");
  });
  it("falls back gracefully for a shape it doesn't recognize", () => {
    expect(maskPhone("12345")).toBe("X2345");
  });
});

describe("maskLast4", () => {
  it("masks bank account numbers", () => {
    expect(maskLast4("123456789012")).toBe("XXXXXXXX9012");
    expect(maskLast4(null)).toBeNull();
  });
});

describe("amountInWords", () => {
  it("uses the Indian numbering system", () => {
    expect(amountInWords("125000.00")).toBe("Rupees One Lakh Twenty Five Thousand Only");
    expect(amountInWords("10000000")).toBe("Rupees One Crore Only");
  });
});
