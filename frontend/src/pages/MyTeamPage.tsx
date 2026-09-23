import { useAuth } from "../context/AuthContext";
import { Who } from "../components/nova/Avatar";
import { C1, C2, C3, C4, C5, C6 } from "../charts/colors";

// Placeholder org chart, shaped like the real hr.Employees data (there's no
// reporting-hierarchy endpoint yet). RamaKrishna is the only MANAGER-role account
// in the seeded data, so everyone else reports to him for this illustration.
const MANAGER_CODE = "IVI-0011";

const PEOPLE = [
  { code: "IVB036", initials: "NY", color: C1, name: "Naga Yashas", designation: "Senior Software Engineer" },
  { code: "IVI-0011", initials: "RG", color: C2, name: "RamaKrishna Gangula", designation: "Delivery Manager" },
  { code: "IVI-1003", initials: "PN", color: C3, name: "Priya Nair", designation: "HR Manager" },
  { code: "IVI-1004", initials: "AM", color: C4, name: "Arjun Mehta", designation: "Payroll Executive" },
  { code: "IVI-1005", initials: "SK", color: C5, name: "Sneha Kulkarni", designation: "Sales Executive" },
  { code: "IVI-1006", initials: "VR", color: C6, name: "Vikram Rao", designation: "Sales Manager" },
  { code: "IVI-1007", initials: "DV", color: C1, name: "Deepak Verma", designation: "IT Manager" },
];

export default function MyTeamPage() {
  const { user } = useAuth();
  const employee = user?.employee;
  const me = PEOPLE.find((p) => p.name === employee?.fullName);
  const isManager = me?.code === MANAGER_CODE;
  const manager = !isManager ? PEOPLE.find((p) => p.code === MANAGER_CODE) : null;
  const teammates = isManager
    ? PEOPLE.filter((p) => p.code !== MANAGER_CODE)
    : PEOPLE.filter((p) => p.code !== MANAGER_CODE && p.code !== me?.code);

  return (
    <main className="nova-scope main scrollbar-thin">
      <div className="hdr">
        <div>
          <h1>My team</h1>
          <div className="sub">Your reporting line and immediate team.</div>
        </div>
      </div>

      <div className="grid">
        <div className="k c5">
          <div className="kh">
            <h3>Reporting line</h3>
          </div>
          <div className="tl">
            <div className="ti a">
              <div className="t">
                <b>{employee?.fullName ?? "You"}</b> &middot; {employee?.designation ?? "Employee"}
              </div>
              <div className="w2">This is you</div>
            </div>
            {manager ? (
              <div className="ti">
                <div className="t">
                  Reports to <b>{manager.name}</b> &middot; {manager.designation}
                </div>
                <div className="w2">{manager.code}</div>
              </div>
            ) : (
              <div className="ti">
                <div className="t">No reporting manager on record</div>
                <div className="w2">Top of the reporting line</div>
              </div>
            )}
          </div>
        </div>

        <div className="k c7">
          <div className="kh">
            <h3>{isManager ? "Direct reports" : "Team members"}</h3>
          </div>
          <table className="tb">
            <thead>
              <tr>
                <th>Employee</th>
                <th className="r">Designation</th>
              </tr>
            </thead>
            <tbody>
              {teammates.map((p) => (
                <tr key={p.code}>
                  <td>
                    <Who initials={p.initials} color={p.color} name={p.name} sub={p.code} />
                  </td>
                  <td className="r">{p.designation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
