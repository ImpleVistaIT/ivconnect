import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Gates a route to specific roles. A user without one of these roles never reaches
// the page — not just a hidden nav icon, an actual route-level block.
export default function RequireRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.some((r) => user.roles.includes(r))) return <Navigate to="/" replace />;
  return <>{children}</>;
}
