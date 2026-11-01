import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  // Refresh par pehle /me ka jawab aane do, warna logged-in user bhi login page par chala jayega
  if (loading)
    return (
      <main className="main">
        <p>Loading...</p>
      </main>
    );
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
