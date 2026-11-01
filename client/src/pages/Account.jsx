import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";

function NavItem({ to, text, icon, active }) {
  const content = (
    <>
      <svg>
        <use href={`/img/icons.svg#icon-${icon}`} />
      </svg>{" "}
      {text}
    </>
  );
  return (
    <li className={active ? "side-nav--active" : ""}>
      {to === "#" ? <a href="#">{content}</a> : <Link to={to}>{content}</Link>}
    </li>
  );
}

export default function Account() {
  const { user, setUser } = useAuth();
  const { showAlert } = useAlert();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const fileRef = useRef(null);
  const [savingData, setSavingData] = useState(false);

  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // same roles as restrictTo() on the API
  const isStaff = ["admin", "lead-guide"].includes(user.role);

  async function handleDataSubmit(e) {
    e.preventDefault();
    setSavingData(true);
    try {
      // File jaati hai to FormData chahiye. Content-Type header khud mat lagana,
      // browser boundary ke saath khud set karta hai.
      const form = new FormData();
      form.append("name", name);
      form.append("email", email);
      if (fileRef.current?.files[0])
        form.append("photo", fileRef.current.files[0]);

      const res = await fetch("/api/v1/users/updateMe", {
        method: "PATCH",
        credentials: "include",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not update data");

      setUser(json.data.user);
      if (fileRef.current) fileRef.current.value = "";
      showAlert("success", "DATA updated successfully!");
    } catch (err) {
      showAlert("error", err.message);
    } finally {
      setSavingData(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setSavingPassword(true);
    try {
      const res = await fetch("/api/v1/users/updateMyPassword", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordCurrent, password, passwordConfirm }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not update password");

      setPasswordCurrent("");
      setPassword("");
      setPasswordConfirm("");
      showAlert("success", "PASSWORD updated successfully!");
    } catch (err) {
      showAlert("error", err.message);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <main className="main">
      <div className="user-view">
        <nav className="user-view__menu">
          <ul className="side-nav">
            <NavItem to="#" text="Settings" icon="settings" active />
            <NavItem to="/my-tours" text="My bookings" icon="briefcase" />
            <NavItem to="/my-reviews" text="My reviews" icon="star" />
            <NavItem to="#" text="Billing" icon="credit-card" />
          </ul>

          {isStaff && (
            <div className="admin-nav">
              <h5 className="admin-nav__heading">Admin</h5>
              <ul className="side-nav">
                <NavItem to="/admin" text="Dashboard" icon="settings" />
                <NavItem to="/admin/tours" text="Manage tours" icon="map" />
                <NavItem
                  to="/admin/reviews"
                  text="Manage reviews"
                  icon="star"
                />
                <NavItem
                  to="/admin/bookings"
                  text="Manage bookings"
                  icon="briefcase"
                />
              </ul>
            </div>
          )}
        </nav>

        <div className="user-view__content">
          <div className="user-view__form-container">
            <h2 className="heading-secondary ma-bt-md">
              Your account settings
            </h2>
            <form className="form form-user-data" onSubmit={handleDataSubmit}>
              <div className="form__group">
                <label className="form__label" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  className="form__input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="form__group ma-bt-md">
                <label className="form__label" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  className="form__input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form__group form__photo-upload">
                <img
                  className="form__user-photo"
                  src={`/img/users/${user.photo}`}
                  alt="User photo"
                />
                <input
                  className="form__upload"
                  type="file"
                  accept="image/*"
                  id="photo"
                  name="photo"
                  ref={fileRef}
                />
                <label htmlFor="photo">Choose new photo</label>
              </div>
              <div className="form__group right">
                <button
                  className="btn btn--small btn--green"
                  disabled={savingData}
                >
                  {savingData ? "Saving..." : "Save settings"}
                </button>
              </div>
            </form>
          </div>

          <div className="line">&nbsp;</div>

          <div className="user-view__form-container">
            <h2 className="heading-secondary ma-bt-md">Password change</h2>
            <form
              className="form form-user-password"
              onSubmit={handlePasswordSubmit}
            >
              <div className="form__group">
                <label className="form__label" htmlFor="password-current">
                  Current password
                </label>
                <input
                  id="password-current"
                  className="form__input"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength="8"
                  value={passwordCurrent}
                  onChange={(e) => setPasswordCurrent(e.target.value)}
                />
              </div>
              <div className="form__group">
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
              <div className="form__group ma-bt-lg">
                <label className="form__label" htmlFor="password-confirm">
                  Confirm password
                </label>
                <input
                  id="password-confirm"
                  className="form__input"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength="8"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                />
              </div>
              <div className="form__group right">
                <button
                  className="btn btn--small btn--green btn--save-password"
                  disabled={savingPassword}
                >
                  {savingPassword ? "Updating..." : "Save password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
