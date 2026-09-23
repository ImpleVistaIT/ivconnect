import { describe, expect, it } from "vitest";
import { validateRow, validateBatch, roundHalfAwayFromZero, type BatchContext, type RawRow } from "./payrollValidation.js";
import { Money } from "../utils/money.js";

const COMPONENTS = [
  { componentId: 1, code: "BASIC", name: "Basic", type: "E" as const, excelHeaderName: "Basic" },
  { componentId: 2, code: "HRA", name: "HRA", type: "E" as const, excelHeaderName: "HRA" },
  { componentId: 3, code: "PF", name: "PF", type: "D" as const, excelHeaderName: "PF" },
];

function ctx(overrides: Partial<BatchContext> = {}): BatchContext {
  return {
    periodYear: 2026,
    periodMonth: 8,
    periodStatus: "Open",
    templateVersion: "1.0",
    knownTemplateVersion: "1.0",
    employeesByCode: new Map([
      ["E001", { employeeId: 1, employmentStatus: "Active", dateOfExit: null, dateOfJoining: new Date("2020-01-01") }],
    ]),
    activeComponents: COMPONENTS,
    priorNetPayByEmployeeId: new Map(),
    declaredControlTotalNet: Money.zero(),
    ...overrides,
  };
}

function row(overrides: Partial<RawRow> = {}): RawRow {
  return {
    excelRowNumber: 2,
    employeeCode: "E001",
    paidDaysRaw: 30,
    lopDaysRaw: 0,
    amountsByHeader: { Basic: 40000, HRA: 16000, PF: 4800 },
    unknownHeaders: [],
    ...overrides,
  };
}

function codesOf(r: ReturnType<typeof validateRow>) {
  return r.codes.map((c) => c.code);
}

describe("per-row validation rules", () => {
  it("PAY001: blank EmployeeCode", () => {
    expect(codesOf(validateRow(row({ employeeCode: "" }), ctx(), new Set()))).toContain("PAY001");
  });

  it("PAY002: EmployeeCode not in the master", () => {
    expect(codesOf(validateRow(row({ employeeCode: "NOPE" }), ctx(), new Set()))).toContain("PAY002");
  });

  it("PAY003: exited before period start", () => {
    const c = ctx({
      employeesByCode: new Map([["E001", { employeeId: 1, employmentStatus: "Exited", dateOfExit: new Date("2026-07-01"), dateOfJoining: new Date("2020-01-01") }]]),
    });
    expect(codesOf(validateRow(row(), c, new Set()))).toContain("PAY003");
  });

  it("PAY004: duplicate EmployeeCode within the file", () => {
    const seen = new Set<string>();
    validateRow(row(), ctx(), seen);
    expect(codesOf(validateRow(row(), ctx(), seen))).toContain("PAY004");
  });

  it("PAY005: non-numeric amount", () => {
    expect(codesOf(validateRow(row({ amountsByHeader: { Basic: "not-a-number", HRA: 16000, PF: 4800 } }), ctx(), new Set()))).toContain("PAY005");
  });

  it("PAY006: negative earning", () => {
    expect(codesOf(validateRow(row({ amountsByHeader: { Basic: -500, HRA: 16000, PF: 4800 } }), ctx(), new Set()))).toContain("PAY006");
  });

  it("PAY007: computed net pay negative", () => {
    expect(codesOf(validateRow(row({ amountsByHeader: { Basic: 1000, HRA: 0, PF: 50000 } }), ctx(), new Set()))).toContain("PAY007");
  });

  it("PAY008: PaidDays out of range", () => {
    expect(codesOf(validateRow(row({ paidDaysRaw: 40 }), ctx(), new Set()))).toContain("PAY008");
    expect(codesOf(validateRow(row({ paidDaysRaw: 20, lopDaysRaw: 20 }), ctx(), new Set()))).toContain("PAY008");
  });

  it("PAY009: period locked", () => {
    expect(codesOf(validateRow(row(), ctx({ periodStatus: "Locked" }), new Set()))).toContain("PAY009");
  });

  it("PAY010: unknown template version", () => {
    expect(codesOf(validateRow(row(), ctx({ templateVersion: "9.9" }), new Set()))).toContain("PAY010");
  });

  it("PAY011: joined during this period (warning)", () => {
    const c = ctx({
      employeesByCode: new Map([["E001", { employeeId: 1, employmentStatus: "Active", dateOfExit: null, dateOfJoining: new Date("2026-08-15") }]]),
    });
    const result = validateRow(row(), c, new Set());
    expect(codesOf(result)).toContain("PAY011");
    expect(result.codes.find((x) => x.code === "PAY011")!.severity).toBe("Warning");
  });

  it("PAY012: net pay differs from previous month by more than 40% (warning)", () => {
    const c = ctx({ priorNetPayByEmployeeId: new Map([[1, Money.fromDb("10000")]]) });
    // computed net here is 40000+16000-4800 = 51200, way more than 40% above 10000
    const result = validateRow(row(), c, new Set());
    expect(codesOf(result)).toContain("PAY012");
    expect(result.codes.find((x) => x.code === "PAY012")!.severity).toBe("Warning");
  });

  it("a clean row produces no codes", () => {
    expect(validateRow(row(), ctx(), new Set()).codes).toEqual([]);
  });
});

describe("component-level rounding (PAY012's rule): round each component, then sum", () => {
  it("gives a different (correct) result than summing first and rounding after", () => {
    // Three components that each round up individually (.005 -> .01 half-away-from-zero),
    // but whose raw sum would round differently if summed first.
    const raw = { Basic: 10.005, HRA: 10.005, PF: 0 };
    const result = validateRow(row({ amountsByHeader: raw }), ctx(), new Set());
    // Round-each-then-sum: 10.01 + 10.01 = 20.02
    expect(result.computedGross).toBe("20.02");
    // Sum-then-round would have given 20.01 (10.005+10.005=20.01, already 2dp) —
    // pick values where the two strategies actually diverge:
    const raw2 = { Basic: 1.005, HRA: 1.005, PF: 0 };
    const result2 = validateRow(row({ amountsByHeader: raw2 }), ctx(), new Set());
    // round-each: 1.01 + 1.01 = 2.02; sum-then-round: 2.01 -> 2.01
    expect(result2.computedGross).toBe("2.02");
  });
});

describe("roundHalfAwayFromZero", () => {
  it("rounds .5 away from zero in both directions", () => {
    expect(roundHalfAwayFromZero(1.005, 2)).toBeCloseTo(1.01, 5);
    expect(roundHalfAwayFromZero(-1.005, 2)).toBeCloseTo(-1.01, 5);
  });
});

describe("batch-level validation rules", () => {
  it("PAY013: unknown header ignored (warning)", () => {
    const rows = [row({ unknownHeaders: ["MysteryColumn"] })];
    const staged = rows.map((r) => validateRow(r, ctx(), new Set()));
    const { codes } = validateBatch(rows, staged, ctx({ declaredControlTotalNet: Money.fromDb(staged[0].computedNet!) }));
    expect(codes.some((c) => c.code === "PAY013" && c.severity === "Warning")).toBe(true);
  });

  it("PAY014: active component absent from file (warning)", () => {
    const rows = [row({ amountsByHeader: { Basic: 40000 } })]; // HRA, PF never appear
    const staged = rows.map((r) => validateRow(r, ctx(), new Set()));
    const { codes } = validateBatch(rows, staged, ctx({ declaredControlTotalNet: Money.fromDb(staged[0].computedNet!) }));
    expect(codes.filter((c) => c.code === "PAY014")).toHaveLength(2);
  });

  it("PAY015: active employee missing from file (warning)", () => {
    const c = ctx({
      employeesByCode: new Map([
        ["E001", { employeeId: 1, employmentStatus: "Active", dateOfExit: null, dateOfJoining: new Date("2020-01-01") }],
        ["E002", { employeeId: 2, employmentStatus: "Active", dateOfExit: null, dateOfJoining: new Date("2020-01-01") }],
      ]),
    });
    const rows = [row()]; // only E001 present
    const staged = rows.map((r) => validateRow(r, c, new Set()));
    const { codes } = validateBatch(rows, staged, { ...c, declaredControlTotalNet: Money.fromDb(staged[0].computedNet!) });
    expect(codes.some((x) => x.code === "PAY015" && x.message.includes("E002"))).toBe(true);
  });

  it("PAY016: control total mismatch (error)", () => {
    const rows = [row()];
    const staged = rows.map((r) => validateRow(r, ctx(), new Set()));
    const { codes } = validateBatch(rows, staged, ctx({ declaredControlTotalNet: Money.fromDb("1") }));
    const pay016 = codes.find((c) => c.code === "PAY016");
    expect(pay016).toBeDefined();
    expect(pay016!.severity).toBe("Error");
  });

  it("PAY016 does not fire when totals match", () => {
    const rows = [row()];
    const staged = rows.map((r) => validateRow(r, ctx(), new Set()));
    const { codes } = validateBatch(rows, staged, ctx({ declaredControlTotalNet: Money.fromDb(staged[0].computedNet!) }));
    expect(codes.some((c) => c.code === "PAY016")).toBe(false);
  });
});
