import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ResetPassword() {
  const { token } = useParams();
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/v1/users/resetPassword/${token}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, passwordConfirm }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.message || "Could not reset password");

      // Backend resetPassword ke baad user ko login bhi kar deta hai
      setUser(json.data.user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="main">
      <div className="login-form">
        <h2 className="heading-secondary ma-bt-lg">Set a new password</h2>
        <form className="form form--login" onSubmit={handleSubmit}>
          <div className="form__group ma-bt-md">
            <label className="form__label" htmlFor="password">
              New password
            </label>
            <input
              id="password"
              className="form__input"
              type="password"
              placeholder="••••••••"
              required
              minLength="8"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="form__group ma-bt-md">
            <label className="form__label" htmlFor="passwordConfirm">
              Confirm password
            </label>
            <input
              id="passwordConfirm"
              className="form__input"
              type="password"
              placeholder="••••••••"
              required
              minLength="8"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
          </div>
          {error && (
            <p style={{ color: "#c0392b", marginBottom: "1.5rem" }}>{error}</p>
          )}
          <div className="form__group">
            <button className="btn btn--green" disabled={submitting}>
              {submitting ? "Saving..." : "Reset password"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
