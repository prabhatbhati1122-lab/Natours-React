import { useState } from "react";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/v1/users/forgotPassword", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.message || "Something went wrong");

      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="main">
      <div className="login-form">
        <h2 className="heading-secondary ma-bt-lg">Forgot your password?</h2>

        {sent ? (
          <div>
            <p style={{ marginBottom: "2rem", fontSize: "1.6rem" }}>
              Reset link sent! Check your inbox (and spam folder). The link is
              valid for a short time only.
            </p>
            <Link to="/login" className="btn btn--green">
              Back to login
            </Link>
          </div>
        ) : (
          <form className="form form--login" onSubmit={handleSubmit}>
            <div className="form__group ma-bt-md">
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
            {error && (
              <p style={{ color: "#c0392b", marginBottom: "1.5rem" }}>
                {error}
              </p>
            )}
            <div className="form__group">
              <button className="btn btn--green" disabled={submitting}>
                {submitting ? "Sending..." : "Send reset link"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
