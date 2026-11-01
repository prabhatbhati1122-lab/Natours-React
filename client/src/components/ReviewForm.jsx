import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";

export default function ReviewForm({ tourId, onSaved }) {
  const { user } = useAuth();
  const { showAlert } = useAlert();

  // "checking" | "hidden" | "can" | "done"
  const [status, setStatus] = useState("checking");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return undefined;
    let ignore = false;

    async function check() {
      try {
        const [toursRes, reviewsRes] = await Promise.all([
          fetch("/api/v1/bookings/my-tours", { credentials: "include" }),
          fetch("/api/v1/reviews/my-reviews", { credentials: "include" }),
        ]);
        const toursJson = await toursRes.json();
        const reviewsJson = await reviewsRes.json();
        if (!toursRes.ok || !reviewsRes.ok) throw new Error("check failed");

        const hasBooked = toursJson.data.doc.some(
          (t) => String(t._id || t.id) === String(tourId),
        );
        const hasReviewed = reviewsJson.data.doc.some(
          (r) =>
            String((r.tour && (r.tour._id || r.tour.id)) || r.tour) ===
            String(tourId),
        );

        if (ignore) return;
        if (!hasBooked) setStatus("hidden");
        else if (hasReviewed) setStatus("done");
        else setStatus("can");
      } catch {
        if (!ignore) setStatus("hidden");
      }
    }

    check();
    return () => {
      ignore = true;
    };
  }, [user, tourId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/v1/reviews", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tour: tourId, review: text, rating }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not save review");

      showAlert("success", "Thanks for your review!");
      setStatus("done");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!user || status === "checking" || status === "hidden") return null;

  if (status === "done") {
    return (
      <p style={{ textAlign: "center", fontSize: "1.6rem", padding: "2rem" }}>
        You have already reviewed this tour. Thank you!
      </p>
    );
  }

  return (
    <div className="login-form" style={{ margin: "4rem auto" }}>
      <h2 className="heading-secondary ma-bt-lg">Write a review</h2>
      <form className="form form--login" onSubmit={handleSubmit}>
        <div className="form__group ma-bt-md">
          <label className="form__label" htmlFor="rating">
            Rating
          </label>
          <select
            id="rating"
            className="form__input"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} / 5
              </option>
            ))}
          </select>
        </div>
        <div className="form__group ma-bt-md">
          <label className="form__label" htmlFor="review">
            Your review
          </label>
          <textarea
            id="review"
            className="form__input"
            rows="4"
            required
            maxLength="1000"
            placeholder="How was the tour?"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        {error && (
          <p style={{ color: "#c0392b", marginBottom: "1.5rem" }}>{error}</p>
        )}
        <div className="form__group">
          <button className="btn btn--green" disabled={submitting}>
            {submitting ? "Saving..." : "Submit review"}
          </button>
        </div>
      </form>
    </div>
  );
}
