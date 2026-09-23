import { describe, expect, it } from "vitest";
import { Money } from "./money.js";

describe("Money", () => {
  it("rounds to 2dp on toDbString", () => {
    expect(Money.fromDb("100.005").toDbString()).toBe("100.01");
    expect(Money.fromDb(49.1).toDbString()).toBe("49.10");
  });

  it("plus/minus/times behave as expected", () => {
    const a = Money.fromDb("100.50");
    const b = Money.fromDb("30.25");
    expect(a.plus(b).toDbString()).toBe("130.75");
    expect(a.minus(b).toDbString()).toBe("70.25");
    expect(a.times(2).toDbString()).toBe("201.00");
  });

  it("zero() and equals() work", () => {
    expect(Money.zero().equals(Money.fromDb("0"))).toBe(true);
    expect(Money.fromDb("1").isNegative()).toBe(false);
    expect(Money.fromDb("-1").isNegative()).toBe(true);
  });

  it("cannot be constructed except via fromDb/zero (compile-time check)", () => {
    // @ts-expect-error Money's constructor is private — this must not compile.
    expect(() => new Money(5)).toBeDefined();
  });
});
