import { Download } from "lucide-react";
import { payslips } from "../data/mockData";
import "./PayslipTable.css";

export default function PayslipTable() {
  return (
    <div className="payslip-card">
      <div className="payslip-card__header">
        <p className="payslip-card__title">Recent payslips</p>
        <button className="payslip-card__link">View all</button>
      </div>

      <table className="payslip-table">
        <thead>
          <tr>
            <th>Period</th>
            <th>Net pay</th>
            <th>Status</th>
            <th aria-label="Download" />
          </tr>
        </thead>
        <tbody>
          {payslips.map((row) => (
            <tr key={row.period}>
              <td className="payslip-table__period">{row.period}</td>
              <td className="payslip-table__amount">&#8377;{row.netPay}</td>
              <td>
                <span className="payslip-table__status">{row.status}</span>
              </td>
              <td>
                <button className="payslip-table__download" aria-label={`Download ${row.period} payslip`}>
                  <Download size={15} strokeWidth={1.8} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
