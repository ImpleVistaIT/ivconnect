import { useState } from "react";
import PillTabs from "../components/PillTabs";
import { Donut } from "../charts/donut";
import { C1, C2, C4, C5 } from "../charts/colors";

const TABS = ["Pipeline", "By stage"];

export default function LeadsPage() {
  const [active, setActive] = useState(TABS[0]);

  return (
    <main className="nova-scope main scrollbar-thin">
      <div className="hdr">
        <div>
          <h1>Leads</h1>
          <div className="sub">Open pipeline and stage movement.</div>
        </div>
      </div>
      <PillTabs tabs={TABS} active={active} onChange={setActive} />

      {active === "Pipeline" && (
        <div className="k c12">
          <div className="kh">
            <h3>Needs a next action</h3>
            <div className="r"><button className="btn s g">All leads</button></div>
          </div>
          <table className="tb">
            <thead>
              <tr><th>Lead</th><th>Stage</th><th className="r">Value</th><th className="r">Due</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Vertex Polymers</b></td>
                <td>Qualified</td>
                <td className="r n s">₹15 L</td>
                <td className="r"><span className="tag wn">Today</span></td>
              </tr>
              <tr>
                <td><b>Bluewave Exports</b></td>
                <td>Proposal</td>
                <td className="r n s">₹9 L</td>
                <td className="r"><span className="tag mu">Tomorrow</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {active === "By stage" && (
        <div className="k c5">
          <div className="kh"><h3>Stage mix</h3></div>
          <Donut
            parts={[
              { n: "New", v: 2, c: C4 },
              { n: "Contacted", v: 1, c: C1 },
              { n: "Qualified", v: 1, c: C2 },
              { n: "Proposal", v: 1, c: C5 },
            ]}
            total={5}
            label={["5", "open leads"]}
          />
        </div>
      )}
    </main>
  );
}
