import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Same idea as ProtectedRoute, but it also checks the role.
// This only hides the pages. The real protection is restrictTo() on the API.
const ALLOWED_ROLES = ["admin", "lead-guide"];

export default function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <main className="main">
        <p>Loading...</p>
      </main>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (!ALLOWED_ROLES.includes(user.role)) return <Navigate to="/" replace />;

  return <Outlet />;
}
