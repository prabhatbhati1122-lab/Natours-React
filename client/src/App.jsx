import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AlertProvider } from "./context/AlertContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Overview from "./pages/Overview";
import Tour from "./pages/Tour";
import Account from "./pages/Account";
import MyTours from "./pages/MyTours";
import MyReviews from "./pages/MyReviews";
import BookingSuccess from "./pages/BookingSuccess";
import AdminDashboard from "./pages/AdminDashboard";
import AdminBookings from "./pages/AdminBookings";
import AdminTours from "./pages/AdminTours";
import AdminReviews from "./pages/AdminReviews";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <AuthProvider>
      <AlertProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="tour/:slug" element={<Tour />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password/:token" element={<ResetPassword />} />
            <Route element={<ProtectedRoute />}>
              <Route path="me" element={<Account />} />
              <Route path="my-tours" element={<MyTours />} />
              <Route path="my-reviews" element={<MyReviews />} />
              <Route path="booking/success" element={<BookingSuccess />} />
            </Route>
            <Route element={<AdminRoute />}>
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="admin/bookings" element={<AdminBookings />} />
              <Route path="admin/tours" element={<AdminTours />} />
              <Route path="admin/reviews" element={<AdminReviews />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AlertProvider>
    </AuthProvider>
  );
}
