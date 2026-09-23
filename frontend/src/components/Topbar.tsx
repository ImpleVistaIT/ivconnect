import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, CircleUserRound, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThemeSwitcher from "./ThemeSwitcher";
import SearchBox from "./SearchBox";
import NotificationButton from "./NotificationButton";
import logo from "../assets/ImplevistaLogo.svg";
import "./Topbar.css";

export default function Topbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    setMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <img src={logo} alt="IV Connect" className="topbar__brand-logo" />
      </div>

      <div className="topbar__actions">
        <ThemeSwitcher />
        <SearchBox />
        <NotificationButton />

        <div className="topbar__user">
          <button
            className="topbar__user-trigger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            type="button"
          >
            <CircleUserRound size={30} strokeWidth={1.3} aria-hidden="true" />
            <span className="topbar__user-text">
              <span className="topbar__user-greeting">Welcome,</span>
              <span className="topbar__user-name">{user?.employee?.fullName ?? user?.userName}</span>
            </span>
            <ChevronDown
              size={16}
              strokeWidth={2}
              className={menuOpen ? "topbar__chevron topbar__chevron--open" : "topbar__chevron"}
            />
          </button>

          {menuOpen && (
            <>
              <div className="topbar__menu-backdrop" onClick={() => setMenuOpen(false)} />
              <nav className="topbar__menu" aria-label="Account">
                <button className="topbar__menu-item topbar__menu-item--danger" onClick={handleSignOut} type="button">
                  <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
                  Sign out
                </button>
              </nav>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
