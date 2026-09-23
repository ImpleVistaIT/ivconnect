import { BrowserRouter, Navigate, Outlet, Routes, Route, useLocation } from "react-router-dom";
import { FileEdit } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Topbar from "./components/Topbar";
import Rail from "./components/Rail";
import RequireRole from "./components/RequireRole";
import DashboardPage from "./pages/DashboardPage";
import LeavePage from "./pages/LeavePage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import PayslipsPage from "./pages/PayslipsPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import TeamPage from "./pages/TeamPage";
import MyTeamPage from "./pages/MyTeamPage";
import EmployeesPage from "./pages/EmployeesPage";
import PayrollBatchesPage from "./pages/PayrollBatchesPage";
import LeadsPage from "./pages/LeadsPage";
import AdminPage from "./pages/AdminPage";
import "./App.css";

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return (
    <div className="nova-scope nova-canvas">
      <div className="nova-shell">
        <Rail />
        <div className="app-shell__body">
          <Topbar />
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/leave" element={<LeavePage />} />
              <Route path="/payslips" element={<PayslipsPage />} />
              <Route
                path="/skills"
                element={
                  <PlaceholderPage
                    icon={FileEdit}
                    title="Update skills"
                    description="Maintain your structured skills profile here — the fixed format is generated from what you fill in, not an uploaded file."
                  />
                }
              />
              <Route path="/my-team" element={<MyTeamPage />} />
              <Route
                path="/team"
                element={
                  <RequireRole roles={["MANAGER"]}>
                    <TeamPage />
                  </RequireRole>
                }
              />
              <Route
                path="/employees"
                element={
                  <RequireRole roles={["HR_ADMIN"]}>
                    <EmployeesPage />
                  </RequireRole>
                }
              />
              <Route
                path="/payroll"
                element={
                  <RequireRole roles={["PAYROLL_ADMIN"]}>
                    <PayrollBatchesPage />
                  </RequireRole>
                }
              />
              <Route
                path="/leads"
                element={
                  <RequireRole roles={["SALES_REP", "SALES_MANAGER"]}>
                    <LeadsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/admin"
                element={
                  <RequireRole roles={["SYS_ADMIN"]}>
                    <AdminPage />
                  </RequireRole>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
