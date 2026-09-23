import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Area } from "../charts/area";
import { Donut } from "../charts/donut";
import { KpiTile } from "../components/nova/KpiTile";
import { Who } from "../components/nova/Avatar";
import { C1, C2, C3, C4, C5, C6 } from "../charts/colors";
import "./DashboardPage.css";

const MONTHS = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];

function EmployeeSection({ firstName }: { firstName: string }) {
  const [payVisible, setPayVisible] = useState(false);

  return (
    <>
      <KpiTile icon="cal" iconBg="var(--okbg)" iconColor="var(--ok)" label="Leave available" value="14.5" unit="days"
        deltaLabel="+3" deltaTone="u" footnote="accrued this quarter" spark={[10, 11, 12, 13, 14, 14.5]} sparkColor={C1} />
      <KpiTile icon="cash" iconBg="var(--accbg)" iconColor="var(--acc)" label="Latest net pay" value="₹86,420"
        deltaLabel="Steady" deltaTone="f" footnote="credited this month" spark={[80600, 84200, 80600, 86420, 86420, 86420]} sparkColor={C2}
        hidden={!payVisible} onToggleHidden={() => setPayVisible((v) => !v)} />
      <KpiTile icon="doc" iconBg="var(--warnbg)" iconColor="var(--warn)" label="Skills status" value="34" unit="days"
        deltaLabel="Due" deltaTone="d" footnote="review by Sunday" spark={[2, 8, 15, 22, 28, 34]} sparkColor={C3} />
      <KpiTile icon="target" iconBg="var(--card3)" iconColor="var(--ink2)" label="Leave requests" value="1"
        deltaLabel="With manager" deltaTone="f" footnote="pending approval" spark={[0, 1, 0, 0, 1, 1]} sparkColor={C4} />

      <div className="k ai c8">
        <div className="kh">
          <h3>Your week</h3>
          <span className="aip"><i /> AI</span>
        </div>
        <p>
          Nothing is blocking you. Your <em>skills profile is 34 days old</em> and due for review before
          Sunday, and your open leave request is still with your manager. Your <em>payslip </em> for this month is ready to view.
        </p>
        <div className="meta">Generated moments ago &middot; leave, payroll and skills records</div>
      </div>

      <div className="k c4">
        <div className="kh">
          <h3>Leave balance</h3>
        </div>
        <Donut parts={[{ n: "Casual", v: 4, c: C1 }, { n: "Sick", v: 3.5, c: C4 }, { n: "Earned", v: 7, c: C2 }]} total={14.5} label={["14.5", "days left"]} />
      </div>

      <div className="k c12">
        <div className="kh">
          <h3>Coming up, {firstName}</h3>
        </div>
        <div className="tl">
          <div className="ti w"><div className="t"><b>Skills review</b> due</div><div className="w2">By Sunday</div></div>
          <div className="ti"><div className="t"><b>Payslip</b> for this month</div><div className="w2">Around month end</div></div>
        </div>
      </div>
    </>
  );
}

function ManagerSection() {
  return (
    <>
      <div className="k c12" style={{ marginTop: 4 }}>
        <div className="kh"><h3 style={{ fontSize: 13, color: "var(--ink2)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Team overview</h3></div>
      </div>
      <KpiTile icon="cal" iconBg="var(--badbg)" iconColor="var(--bad)" label="Waiting on you" value="2"
        deltaLabel="2 days" deltaTone="d" footnote="oldest request" spark={[0, 1, 1, 2, 2, 2]} sparkColor={C6} />
      <KpiTile icon="users" iconBg="var(--okbg)" iconColor="var(--ok)" label="Available today" value="1" unit="of 1"
        deltaLabel="Steady" deltaTone="f" footnote="direct report" spark={[1, 1, 1, 1, 1, 1]} sparkColor={C1} />
      <KpiTile icon="doc" iconBg="var(--accbg)" iconColor="var(--acc)" label="Skills overdue" value="0" unit="of 1"
        deltaLabel="On track" deltaTone="u" footnote="team compliance" spark={[1, 1, 0, 0, 0, 0]} sparkColor={C2} />
      <KpiTile icon="up" iconBg="var(--warnbg)" iconColor="var(--warn)" label="Utilisation" value="84" unit="%"
        deltaLabel="+3 pts" deltaTone="u" footnote="target 80%" spark={[76, 78, 79, 81, 82, 84]} sparkColor={C3} />

      <div className="k c7">
        <div className="kh"><h3>Approval queue</h3></div>
        <table className="tb">
          <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th className="r">Days</th><th className="r">Waiting</th></tr></thead>
          <tbody>
            <tr>
              <td><Who initials="NY" color={C1} name="Naga Yashas" sub="IVB036" /></td>
              <td>Casual</td><td>12&ndash;14 Aug</td><td className="r n s">3</td>
              <td className="r"><span className="tag wn">2 days</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="k c5">
        <div className="kh"><h3>Where the team is allocated</h3></div>
        <Donut parts={[{ n: "Web & app delivery", v: 1, c: C1 }]} total={1} label={["1", "person"]} />
      </div>
    </>
  );
}

function HrSection() {
  return (
    <>
      <div className="k c12" style={{ marginTop: 4 }}>
        <div className="kh"><h3 style={{ fontSize: 13, color: "var(--ink2)", textTransform: "uppercase", letterSpacing: "0.04em" }}>People overview</h3></div>
      </div>
      <KpiTile icon="users" iconBg="var(--okbg)" iconColor="var(--ok)" label="Active headcount" value="7"
        deltaLabel="Steady" deltaTone="f" footnote="across all practices" spark={[7, 7, 7, 7, 7, 7]} sparkColor={C1} />
      <KpiTile icon="doc" iconBg="var(--accbg)" iconColor="var(--acc)" label="Skills current" value="86" unit="%"
        deltaLabel="+6 pts" deltaTone="u" footnote="1 past review" spark={[74, 78, 80, 82, 84, 86]} sparkColor={C2} />
      <KpiTile icon="cal" iconBg="var(--warnbg)" iconColor="var(--warn)" label="Leave this month" value="4"
        deltaLabel="1 pending" deltaTone="f" footnote="with managers" spark={[1, 2, 3, 3, 4, 4]} sparkColor={C3} />
      <KpiTile icon="up" iconBg="var(--badbg)" iconColor="var(--bad)" label="Attrition, rolling 12m" value="0" unit="%"
        deltaLabel="Steady" deltaTone="u" footnote="below target" spark={[0, 0, 0, 0, 0, 0]} sparkColor={C6} />

      <div className="k c5">
        <div className="kh"><h3>Skills currency</h3></div>
        <Donut parts={[{ n: "Up to date", v: 6, c: C1 }, { n: "Due soon", v: 1, c: C3 }]} total={7} label={["86%", "current"]} />
      </div>

      <div className="k c7">
        <div className="kh"><h3>Needs action</h3></div>
        <table className="tb">
          <thead><tr><th>Employee</th><th>Practice</th><th>Skills profile age</th><th className="r">Status</th></tr></thead>
          <tbody>
            <tr>
              <td><Who initials="AM" color={C2} name="Arjun Mehta" sub="IVI-1004" /></td>
              <td>Payroll</td><td className="n">35 days</td>
              <td className="r"><span className="tag wn">Due soon</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function PayrollSection() {
  return (
    <>
      <div className="k c12" style={{ marginTop: 4 }}>
        <div className="kh"><h3 style={{ fontSize: 13, color: "var(--ink2)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Payroll run</h3></div>
      </div>
      <KpiTile icon="cal" iconBg="var(--warnbg)" iconColor="var(--warn)" label="Current run" value="Open"
        deltaLabel="On track" deltaTone="f" footnote="no errors outstanding" spark={[1, 1, 1, 1, 1, 1]} sparkColor={C3} />
      <KpiTile icon="users" iconBg="var(--okbg)" iconColor="var(--ok)" label="In this run" value="7" unit="of 7"
        deltaLabel="Steady" deltaTone="f" footnote="no exits this period" spark={[7, 7, 7, 7, 7, 7]} sparkColor={C1} />
      <KpiTile icon="cash" iconBg="var(--accbg)" iconColor="var(--acc)" label="Net payout" value="₹6.1" unit="L"
        deltaLabel="+1.2%" deltaTone="u" footnote="gross ₹7.4 L" spark={[5.6, 5.8, 5.9, 6.0, 6.05, 6.1]} sparkColor={C2} />
      <KpiTile icon="doc" iconBg="var(--badbg)" iconColor="var(--bad)" label="Rows to fix" value="0"
        deltaLabel="Clear" deltaTone="u" footnote="nothing pending" spark={[0, 0, 0, 0, 0, 0]} sparkColor={C6} />

      <div className="k c8">
        <div className="kh"><h3>Payout, last six months</h3></div>
        <Area series={[{ v: [5.6, 5.8, 5.9, 6.0, 6.05, 6.1], c: C1 }]} labels={MONTHS} />
        <div className="legend"><span><i style={{ background: C1 }} />Net, ₹ lakh</span></div>
      </div>

      <div className="k c4">
        <div className="kh"><h3>Where the money goes</h3></div>
        <Donut parts={[{ n: "Net pay", v: 61, c: C1 }, { n: "PF and ESI", v: 8, c: C2 }, { n: "Income tax", v: 5, c: C5 }]} total={74} label={["₹7.4", "L gross"]} />
      </div>
    </>
  );
}

function SalesSection() {
  return (
    <>
      <div className="k c12" style={{ marginTop: 4 }}>
        <div className="kh"><h3 style={{ fontSize: 13, color: "var(--ink2)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Revenue pipeline</h3></div>
      </div>
      <KpiTile icon="target" iconBg="var(--okbg)" iconColor="var(--ok)" label="Pipeline value" value="₹42" unit="L"
        deltaLabel="+₹6 L" deltaTone="u" footnote="5 open leads" spark={[30, 33, 36, 38, 40, 42]} sparkColor={C1} />
      <KpiTile icon="cash" iconBg="var(--accbg)" iconColor="var(--acc)" label="Weighted forecast" value="₹18" unit="L"
        deltaLabel="+8%" deltaTone="u" footnote="this quarter" spark={[12, 13, 14, 16, 17, 18]} sparkColor={C2} />
      <KpiTile icon="cal" iconBg="var(--badbg)" iconColor="var(--bad)" label="Overdue actions" value="1"
        deltaLabel="+1" deltaTone="d" footnote="one owner" spark={[0, 0, 0, 1, 1, 1]} sparkColor={C6} />
      <KpiTile icon="up" iconBg="var(--warnbg)" iconColor="var(--warn)" label="Win rate" value="22" unit="%"
        deltaLabel="+2 pts" deltaTone="u" footnote="this quarter" spark={[17, 18, 19, 20, 21, 22]} sparkColor={C3} />

      <div className="k c8">
        <div className="kh"><h3>Pipeline movement</h3></div>
        <Area series={[{ v: [28, 32, 34, 37, 40, 42], c: C1 }, { v: [10, 12, 13, 15, 17, 18], c: C2 }]} labels={MONTHS} />
        <div className="legend">
          <span><i style={{ background: C1 }} />Open pipeline, ₹L</span>
          <span><i style={{ background: C2 }} />Weighted, ₹L</span>
        </div>
      </div>

      <div className="k c4">
        <div className="kh"><h3>Stage mix</h3></div>
        <Donut parts={[{ n: "New", v: 2, c: C4 }, { n: "Qualified", v: 2, c: C2 }, { n: "Proposal", v: 1, c: C5 }]} total={5} label={["5", "open leads"]} />
      </div>
    </>
  );
}

function AdminSection() {
  return (
    <>
      <div className="k c12" style={{ marginTop: 4 }}>
        <div className="kh"><h3 style={{ fontSize: 13, color: "var(--ink2)", textTransform: "uppercase", letterSpacing: "0.04em" }}>System and security</h3></div>
      </div>
      <KpiTile icon="users" iconBg="var(--okbg)" iconColor="var(--ok)" label="Active accounts" value="7"
        deltaLabel="7" deltaTone="f" footnote="signed in this week" spark={[6, 6, 7, 7, 7, 7]} sparkColor={C1} />
      <KpiTile icon="bell" iconBg="var(--warnbg)" iconColor="var(--warn)" label="Failed sign-ins" value="0"
        deltaLabel="Clear" deltaTone="u" footnote="last 24 hours" spark={[1, 1, 0, 0, 0, 0]} sparkColor={C3} />
      <KpiTile icon="cog" iconBg="var(--badbg)" iconColor="var(--bad)" label="Jobs failing" value="0"
        deltaLabel="Healthy" deltaTone="u" footnote="all jobs green" spark={[0, 0, 0, 0, 0, 0]} sparkColor={C6} />
      <KpiTile icon="doc" iconBg="var(--accbg)" iconColor="var(--acc)" label="PAN reveals" value="1"
        deltaLabel="By HR" deltaTone="f" footnote="this week" spark={[0, 0, 1, 1, 1, 1]} sparkColor={C2} />

      <div className="k c5">
        <div className="kh"><h3>Accounts by role</h3></div>
        <Donut parts={[{ n: "Employee only", v: 1, c: C1 }, { n: "Manager", v: 1, c: C4 }, { n: "Sales", v: 2, c: C2 }, { n: "HR, payroll, admin", v: 3, c: C5 }]} total={7} label={["7", "accounts"]} />
      </div>

      <div className="k c7">
        <div className="kh"><h3>Audit trail</h3></div>
        <table className="tb">
          <thead><tr><th>Actor</th><th>Event</th></tr></thead>
          <tbody>
            <tr>
              <td><Who initials="DV" color={C5} name="Deepak Verma" sub="IVI-1007" /></td>
              <td><span className="tag ok">Role assignment reviewed</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

const ROLE_SECTIONS: Record<string, () => React.ReactNode> = {
  MANAGER: ManagerSection,
  HR_ADMIN: HrSection,
  PAYROLL_ADMIN: PayrollSection,
  SALES_REP: SalesSection,
  SALES_MANAGER: SalesSection,
  SYS_ADMIN: AdminSection,
};

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.employee?.firstName ?? user?.userName ?? "there";

  // Every account holds EMPLOYEE, so the personal section always renders. Each
  // additional real role appends its own section once, even if a user held
  // both SALES_REP and SALES_MANAGER (same section, rendered only once).
  const extraSections = [...new Set((user?.roles ?? []).filter((r) => r !== "EMPLOYEE"))]
    .map((r) => ROLE_SECTIONS[r])
    .filter(Boolean);

  return (
    <main className="nova-scope main dashboard-page scrollbar-thin">
      <div className="hdr">
        <div>
          <h1>Good morning, {firstName}</h1>
          <div className="sub">Here&rsquo;s what&rsquo;s on your desk today.</div>
        </div>
      </div>

      <div className="grid">
        <EmployeeSection firstName={firstName} />
        {extraSections.map((Section, i) => (
          <Section key={i} />
        ))}
      </div>
    </main>
  );
}
