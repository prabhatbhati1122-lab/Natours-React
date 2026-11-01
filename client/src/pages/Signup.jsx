import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";

export default function Signup() {
  const { user, setUser } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // already logged in, nothing to sign up for
  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();

    if (password !== passwordConfirm) {
      showAlert("error", "Passwords are not the same");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/users/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, passwordConfirm }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not create account");

      setUser(json.data.user);
      showAlert("success", "Account created! Welcome to Natours.");
      navigate("/");
    } catch (err) {
      showAlert("error", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="main">
      <div className="login-form">
        <h2 className="heading-secondary ma-bt-lg">Create your account</h2>
        <form className="form form--signup" onSubmit={handleSubmit}>
          <div className="form__group">
            <label className="form__label" htmlFor="name">
              Your name
            </label>
            <input
              id="name"
              className="form__input"
              type="text"
              placeholder="Your name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form__group">
            <label className="form__label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              className="form__input"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form__group ma-bt-md">
            <label className="form__label" htmlFor="password">
              Password
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
          <div className="form__group">
            <button className="btn btn--green" disabled={submitting}>
              {submitting ? "Creating account..." : "Sign up"}
            </button>
          </div>
        </form>
        <p style={{ marginTop: "2rem" }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </main>
  );
}
