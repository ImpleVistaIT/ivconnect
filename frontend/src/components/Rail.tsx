import { Link, NavLink } from "react-router-dom";
import { Icon } from "./Icon";
import { modulesForRoles } from "../modules";
import { useAuth } from "../context/AuthContext";
import mark from "../assets/nova_mark.png";

export default function Rail() {
  const { user } = useAuth();
  const modules = modulesForRoles(user?.roles ?? []);

  return (
    <nav className="rail" aria-label="Modules">
      <Link to="/" className="mark" aria-label="Dashboard">
        <img src={mark} alt="IV Connect" />
      </Link>
      {modules.map((m) => (
        <NavLink
          key={m.id}
          to={m.path}
          end={m.path === "/"}
          className={({ isActive }) => `rb${isActive ? " on" : ""}`}
          aria-label={m.label}
        >
          <Icon name={m.icon} />
          <span className="tip">{m.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
