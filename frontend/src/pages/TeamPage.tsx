import { useState } from "react";
import PillTabs from "../components/PillTabs";
import { Who } from "../components/nova/Avatar";
import { C1 } from "../charts/colors";

const TABS = ["Approvals", "My team"];

export default function TeamPage() {
  const [active, setActive] = useState(TABS[0]);

  return (
    <main className="nova-scope main scrollbar-thin">
      <div className="hdr">
        <div>
          <h1>Team &amp; approvals</h1>
          <div className="sub">Leave requests and reportees for your team.</div>
        </div>
      </div>
      <PillTabs tabs={TABS} active={active} onChange={setActive} />

      {active === "Approvals" && (
        <div className="k c12">
          <div className="kh">
            <h3>Approval queue</h3>
            <div className="r"><button className="btn s g">Approve selected</button></div>
          </div>
          <table className="tb">
            <thead>
              <tr><th>Employee</th><th>Type</th><th>Dates</th><th className="r">Days</th><th className="r">Waiting</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><Who initials="NY" color={C1} name="Naga Yashas" sub="IVB036" /></td>
                <td>Casual</td><td>12&ndash;14 Aug</td><td className="r n s">3</td>
                <td className="r"><span className="tag wn">2 days</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {active === "My team" && (
        <div className="k c12">
          <div className="kh"><h3>Direct reports</h3></div>
          <table className="tb">
            <thead>
              <tr><th>Employee</th><th>Designation</th><th className="r">Leave balance</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><Who initials="NY" color={C1} name="Naga Yashas" sub="IVB036" /></td>
                <td>Senior Software Engineer</td>
                <td className="r n">14.5</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
