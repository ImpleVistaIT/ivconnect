import { Decimal } from "decimal.js";

export class Money {
  // Private members make the type nominal; +, -, * on Money are type errors.
  private readonly value: Decimal;

  private constructor(value: Decimal) {
    this.value = value;
  }

  static fromDb(raw: string | number): Money {
    return new Money(new Decimal(raw));
  }

  static zero(): Money {
    return new Money(new Decimal(0));
  }

  plus(other: Money): Money {
    return new Money(this.value.plus(other.value));
  }

  minus(other: Money): Money {
    return new Money(this.value.minus(other.value));
  }

  times(factor: number | string): Money {
    return new Money(this.value.times(factor));
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  equals(other: Money): boolean {
    return this.value.equals(other.value);
  }

  toDbString(): string {
    return this.value.toFixed(2);
  }

  toDisplay(): string {
    return `₹${this.value.toFixed(2)}`;
  }
}
