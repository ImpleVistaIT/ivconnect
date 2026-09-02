import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FileText, FileEdit } from "lucide-react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import DashboardPage from "./pages/DashboardPage";
import LeavePage from "./pages/LeavePage";
import ProfilePage from "./pages/ProfilePage";
import PlaceholderPage from "./pages/PlaceholderPage";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <div className="app-shell__body">
          <Topbar />
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/leave" element={<LeavePage />} />
            <Route
              path="/payslips"
              element={
                <PlaceholderPage
                  icon={FileText}
                  title="Payslips"
                  description="The full payslip list and download history lives here — the dashboard already shows your most recent payslips."
                />
              }
            />
            <Route
              path="/resume"
              element={
                <PlaceholderPage
                  icon={FileEdit}
                  title="Resume"
                  description="Maintain your structured resume sections here — the fixed format is generated from what you fill in, not an uploaded file."
                />
              }
            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
