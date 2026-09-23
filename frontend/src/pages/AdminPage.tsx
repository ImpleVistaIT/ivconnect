import { useState } from "react";
import PillTabs from "../components/PillTabs";
import { Who } from "../components/nova/Avatar";
import { C1, C2, C3, C4, C5, C6 } from "../charts/colors";

const TABS = ["Users", "Audit trail"];

const USERS = [
  { initials: "NY", color: C1, name: "Naga Yashas", code: "IVB036", roles: "EMPLOYEE" },
  { initials: "RG", color: C2, name: "RamaKrishna Gangula", code: "IVI-0011", roles: "EMPLOYEE + MANAGER" },
  { initials: "PN", color: C3, name: "Priya Nair", code: "IVI-1003", roles: "EMPLOYEE + HR_ADMIN" },
  { initials: "AM", color: C4, name: "Arjun Mehta", code: "IVI-1004", roles: "EMPLOYEE + PAYROLL_ADMIN" },
  { initials: "SK", color: C5, name: "Sneha Kulkarni", code: "IVI-1005", roles: "EMPLOYEE + SALES_REP" },
  { initials: "VR", color: C6, name: "Vikram Rao", code: "IVI-1006", roles: "EMPLOYEE + SALES_MANAGER" },
  { initials: "DV", color: C1, name: "Deepak Verma", code: "IVI-1007", roles: "EMPLOYEE + SYS_ADMIN" },
];

export default function AdminPage() {
  const [active, setActive] = useState(TABS[0]);

  return (
    <main className="nova-scope main scrollbar-thin">
      <div className="hdr">
        <div>
          <h1>Users &amp; audit</h1>
          <div className="sub">Accounts, role assignments and the security audit trail.</div>
        </div>
      </div>
      <PillTabs tabs={TABS} active={active} onChange={setActive} />

      {active === "Users" && (
        <div className="k c12">
          <div className="kh"><h3>All accounts</h3></div>
          <table className="tb">
            <thead>
              <tr><th>Employee</th><th className="r">Roles</th></tr>
            </thead>
            <tbody>
              {USERS.map((u) => (
                <tr key={u.code}>
                  <td><Who initials={u.initials} color={u.color} name={u.name} sub={u.code} /></td>
                  <td className="r"><span className="tag mu">{u.roles}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active === "Audit trail" && (
        <div className="k c12">
          <div className="kh"><h3>Recent events</h3></div>
          <table className="tb">
            <thead>
              <tr><th>Actor</th><th>Event</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><Who initials="DV" color={C1} name="Deepak Verma" sub="IVI-1007" /></td>
                <td><span className="tag ok">Seeded base EMPLOYEE role onto all specialized accounts</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
