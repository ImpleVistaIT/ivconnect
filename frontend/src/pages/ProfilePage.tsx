import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import PillTabs from "../components/PillTabs";
import ProfileDetailsTab from "../components/profile/ProfileDetailsTab";
import DocumentsTab from "../components/profile/DocumentsTab";
import "./ProfilePage.css";

const TABS = ["Profile details", "Documents"];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const emp = useAuth().user?.employee;
  const initials = (emp?.fullName ?? "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <main className="profile-page scrollbar-thin">
      <div className="profile-page__intro">
        <div className="profile-page__avatar">{initials}</div>
        <div>
          <h1 className="profile-page__name">{emp?.fullName}</h1>
          <p className="profile-page__subtitle">
            {emp?.employeeCode} &middot; {emp?.designation}
          </p>
        </div>
      </div>

      <PillTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === "Profile details" && <ProfileDetailsTab />}
      {activeTab === "Documents" && <DocumentsTab />}
    </main>
  );
}
