import type { IconName } from "./components/Icon";

export interface ModuleDef {
  id: string;
  label: string;
  path: string;
  icon: IconName;
  // Roles that unlock this module. Omitted = every account (they all hold EMPLOYEE).
  roles?: string[];
  // Extra terms the search bar matches against, beyond the label itself.
  keywords?: string[];
}

export const MODULES: ModuleDef[] = [
  { id: "dashboard", label: "Dashboard", path: "/", icon: "grid", keywords: ["home", "overview"] },
  { id: "leave", label: "Leave", path: "/leave", icon: "cal", keywords: ["vacation", "time off", "holiday", "apply leave", "leave balance", "leave request"] },
  { id: "payslips", label: "Payslips", path: "/payslips", icon: "doc", keywords: ["payslip", "pay slip", "salary", "salary slip", "pay", "net pay", "earnings"] },
  { id: "resume", label: "Update skills", path: "/skills", icon: "spark", keywords: ["resume", "cv", "skills", "profile compliance"] },
  { id: "profile", label: "Profile", path: "/profile", icon: "user", keywords: ["my profile", "personal details", "documents", "account"] },
  { id: "hierarchy", label: "My team", path: "/my-team", icon: "layers", keywords: ["hierarchy", "org chart", "reporting line", "manager", "teammates", "team members"] },
  { id: "team", label: "Team & approvals", path: "/team", icon: "users", roles: ["MANAGER"], keywords: ["approvals", "reportees", "approve leave"] },
  { id: "employees", label: "Employees", path: "/employees", icon: "users2", roles: ["HR_ADMIN"], keywords: ["directory", "employee master", "headcount"] },
  { id: "payroll", label: "Payroll batches", path: "/payroll", icon: "cash", roles: ["PAYROLL_ADMIN"], keywords: ["payroll run", "batch", "commit payroll", "upload payroll"] },
  { id: "leads", label: "Leads", path: "/leads", icon: "target", roles: ["SALES_REP", "SALES_MANAGER"], keywords: ["pipeline", "sales", "deals", "prospects"] },
  { id: "admin", label: "Users & audit", path: "/admin", icon: "cog", roles: ["SYS_ADMIN"], keywords: ["users", "audit trail", "accounts", "roles", "security"] },
];

export function modulesForRoles(roles: string[]): ModuleDef[] {
  return MODULES.filter((m) => !m.roles || m.roles.some((r) => roles.includes(r)));
}

export function searchModules(roles: string[], query: string): ModuleDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return modulesForRoles(roles).filter(
    (m) => m.label.toLowerCase().includes(q) || m.keywords?.some((k) => k.includes(q) || q.includes(k)),
  );
}
