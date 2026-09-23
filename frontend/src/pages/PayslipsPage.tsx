import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./PayslipsPage.css";

interface Payslip {
  id: number;
  year: number;
  month: number;
  paidDays: string;
  lopDays: string;
  grossEarnings: string;
  totalDeductions: string;
  netPay: string;
  netPayInWords: string;
}

const inr = (value: string) =>
  `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const periodLabel = (p: Payslip) =>
  new Date(p.year, p.month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const sum = (rows: Payslip[], key: "grossEarnings" | "totalDeductions") =>
  rows.reduce((total, r) => total + Number(r[key]), 0);

export default function PayslipsPage() {
  const employee = useAuth().user?.employee;
  const [payslips, setPayslips] = useState<Payslip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState<Set<number>>(new Set());

  useEffect(() => {
    api<Payslip[]>("/payslips/me")
      .then(setPayslips)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load payslips"));
  }, []);

  const toggle = (id: number) =>
    setVisible((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const latest = payslips?.[0];

  return (
    <main className="payslips-page scrollbar-thin">
      <div className="payslips-page__intro">
        <h1 className="payslips-page__title">Payslips</h1>
        <p className="payslips-page__subtitle">
          Monthly pay statements for {employee?.fullName} · {employee?.employeeCode}
        </p>
      </div>

      {error && <p role="alert">{error}</p>}
      {!error && payslips === null && <p>Loading…</p>}
      {payslips?.length === 0 && <p>No payslips have been published for you yet.</p>}

      {latest && payslips && (
        <>
          <div className="payslips-page__summary">
            <div className="payslips-summary-card">
              <p className="payslips-summary-card__label">Latest net pay</p>
              <p className="payslips-summary-card__value">{inr(latest.netPay)}</p>
              <p className="payslips-summary-card__footnote">{periodLabel(latest)}</p>
            </div>
            <div className="payslips-summary-card">
              <p className="payslips-summary-card__label">Gross pay (last {payslips.length} months)</p>
              <p className="payslips-summary-card__value">{inr(String(sum(payslips, "grossEarnings")))}</p>
            </div>
            <div className="payslips-summary-card">
              <p className="payslips-summary-card__label">Deductions (last {payslips.length} months)</p>
              <p className="payslips-summary-card__value">{inr(String(sum(payslips, "totalDeductions")))}</p>
            </div>
          </div>

          <div className="payslips-table-card">
            <table className="payslips-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Paid days</th>
                  <th>Gross pay</th>
                  <th>Deductions</th>
                  <th>Net pay</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((row) => {
                  const shown = visible.has(row.id);
                  return (
                    <tr key={row.id}>
                      <td className="payslips-table__period">{periodLabel(row)}</td>
                      <td className="payslips-table__muted">
                        {Number(row.paidDays)}
                        {Number(row.lopDays) > 0 && (
                          <span className="payslips-table__lop"> ({Number(row.lopDays)} LOP)</span>
                        )}
                      </td>
                      <td className="payslips-table__amount">{inr(row.grossEarnings)}</td>
                      <td className="payslips-table__amount">{inr(row.totalDeductions)}</td>
                      <td className="payslips-table__amount">
                        <span className="payslips-table__amount-value" title={shown ? row.netPayInWords : undefined}>
                          {shown ? inr(row.netPay) : "••••••"}
                        </span>
                        <button
                          className="payslips-table__reveal"
                          onClick={() => toggle(row.id)}
                          aria-label={shown ? `Hide ${periodLabel(row)} net pay` : `Show ${periodLabel(row)} net pay`}
                          aria-pressed={shown}
                        >
                          {shown ? <EyeOff size={14} strokeWidth={1.8} /> : <Eye size={14} strokeWidth={1.8} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
