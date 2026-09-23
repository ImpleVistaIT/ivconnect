import { useState } from "react";
import PillTabs from "../components/PillTabs";
import { Who } from "../components/nova/Avatar";
import { C1, C2, C3, C4, C5, C6 } from "../charts/colors";

const TABS = ["Directory", "Skills compliance"];

const DIRECTORY = [
  { initials: "NY", color: C1, name: "Naga Yashas", code: "IVB036", designation: "Senior Software Engineer", role: "EMPLOYEE" },
  { initials: "RG", color: C2, name: "RamaKrishna Gangula", code: "IVI-0011", designation: "Delivery Manager", role: "MANAGER" },
  { initials: "PN", color: C3, name: "Priya Nair", code: "IVI-1003", designation: "HR Manager", role: "HR_ADMIN" },
  { initials: "AM", color: C4, name: "Arjun Mehta", code: "IVI-1004", designation: "Payroll Executive", role: "PAYROLL_ADMIN" },
  { initials: "SK", color: C5, name: "Sneha Kulkarni", code: "IVI-1005", designation: "Sales Executive", role: "SALES_REP" },
  { initials: "VR", color: C6, name: "Vikram Rao", code: "IVI-1006", designation: "Sales Manager", role: "SALES_MANAGER" },
  { initials: "DV", color: C1, name: "Deepak Verma", code: "IVI-1007", designation: "IT Manager", role: "SYS_ADMIN" },
];

export default function EmployeesPage() {
  const [active, setActive] = useState(TABS[0]);

  return (
    <main className="nova-scope main scrollbar-thin">
      <div className="hdr">
        <div>
          <h1>Employees</h1>
          <div className="sub">Employee master and skills compliance across the company.</div>
        </div>
      </div>
      <PillTabs tabs={TABS} active={active} onChange={setActive} />

      {active === "Directory" && (
        <div className="k c12">
          <div className="kh"><h3>All employees</h3></div>
          <table className="tb">
            <thead>
              <tr><th>Employee</th><th>Designation</th><th className="r">Role</th></tr>
            </thead>
            <tbody>
              {DIRECTORY.map((e) => (
                <tr key={e.code}>
                  <td><Who initials={e.initials} color={e.color} name={e.name} sub={e.code} /></td>
                  <td>{e.designation}</td>
                  <td className="r"><span className="tag mu">{e.role}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active === "Skills compliance" && (
        <div className="k c12">
          <div className="kh"><h3>Skills review status</h3></div>
          <table className="tb">
            <thead>
              <tr><th>Employee</th><th>Skills profile age</th><th className="r">Status</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><Who initials="AM" color={C4} name="Arjun Mehta" sub="IVI-1004" /></td>
                <td className="n">35 days</td>
                <td className="r"><span className="tag wn">Due soon</span></td>
              </tr>
              <tr>
                <td><Who initials="NY" color={C1} name="Naga Yashas" sub="IVB036" /></td>
                <td className="n">34 days</td>
                <td className="r"><span className="tag wn">Due soon</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
