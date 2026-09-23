import { useState } from "react";
import PillTabs from "../components/PillTabs";

const TABS = ["Batch history", "Validation"];

export default function PayrollBatchesPage() {
  const [active, setActive] = useState(TABS[0]);

  return (
    <main className="nova-scope main scrollbar-thin">
      <div className="hdr">
        <div>
          <h1>Payroll batches</h1>
          <div className="sub">Upload, validate and commit monthly payroll runs.</div>
        </div>
      </div>
      <PillTabs tabs={TABS} active={active} onChange={setActive} />

      {active === "Batch history" && (
        <div className="k c12">
          <div className="kh">
            <h3>Recent batches</h3>
            <div className="r"><button className="btn p">Upload batch</button></div>
          </div>
          <table className="tb">
            <thead>
              <tr><th>Period</th><th className="r">Rows</th><th className="r">Net total</th><th className="r">Status</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>August 2026</td>
                <td className="r n">7</td>
                <td className="r n s">₹6,12,000</td>
                <td className="r"><span className="tag ok">Committed</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {active === "Validation" && (
        <div className="k c12">
          <div className="kh"><h3>Validation result</h3></div>
          <table className="tb">
            <thead>
              <tr><th className="r">Row</th><th>Employee</th><th>Issue</th><th className="r">Severity</th></tr>
            </thead>
            <tbody>
              <tr>
                <td className="r n" colSpan={4} style={{ textAlign: "center", color: "var(--ink3)" }}>
                  No open validation issues.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
