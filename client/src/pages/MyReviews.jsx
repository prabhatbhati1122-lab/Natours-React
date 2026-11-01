import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAlert } from "../context/AlertContext";

function Stars({ rating }) {
  return (
    <div className="reviews__rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`reviews__star reviews__star--${
            rating >= star ? "active" : "inactive"
          }`}
        >
          <use href="/img/icons.svg#icon-star" />
        </svg>
      ))}
    </div>
  );
}

export default function MyReviews() {
  const { showAlert } = useAlert();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // which review is being edited, and its draft values
  const [editingId, setEditingId] = useState(null);
  const [draftText, setDraftText] = useState("");
  const [draftRating, setDraftRating] = useState(5);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const res = await fetch("/api/v1/reviews/my-reviews", {
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok)
          throw new Error(json.message || "Could not load your reviews");
        if (!ignore) setReviews(json.data.doc);
      } catch (err) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  function startEdit(r) {
    setEditingId(r._id || r.id);
    setDraftText(r.review);
    setDraftRating(r.rating || 5);
  }

  async function saveEdit(id) {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/reviews/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review: draftText, rating: draftRating }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not update review");

      setReviews((list) =>
        list.map((r) =>
          (r._id || r.id) === id
            ? { ...r, review: draftText, rating: draftRating }
            : r,
        ),
      );
      setEditingId(null);
      showAlert("success", "Review updated");
    } catch (err) {
      showAlert("error", err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this review?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/reviews/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      // a successful delete answers 204 with no body, so we do not read json here
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || "Could not delete review");
      }

      setReviews((list) => list.filter((r) => (r._id || r.id) !== id));
      showAlert("success", "Review deleted");
    } catch (err) {
      showAlert("error", err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="main">
      <div style={{ width: "100%", maxWidth: "90rem", margin: "0 auto" }}>
        <h2 className="heading-secondary ma-bt-lg">My reviews</h2>

        {loading && <p>Loading your reviews...</p>}
        {error && <p>{error}</p>}
        {!loading && !error && reviews.length === 0 && (
          <p>
            You have not written any reviews yet. Open a tour you have booked
            from <Link to="/my-tours">My tours</Link> and review it there.
          </p>
        )}

        {reviews.map((r) => {
          const id = r._id || r.id;
          const isEditing = editingId === id;

          return (
            <div
              key={id}
              className="reviews__card"
              style={{ marginBottom: "3rem", width: "100%" }}
            >
              <h6 className="reviews__user" style={{ marginBottom: "1rem" }}>
                {r.tour ? (
                  <Link to={`/tour/${r.tour.slug}`}>{r.tour.name}</Link>
                ) : (
                  "Tour no longer available"
                )}
              </h6>

              {isEditing ? (
                <>
                  <select
                    className="form__input"
                    value={draftRating}
                    onChange={(e) => setDraftRating(Number(e.target.value))}
                    style={{ marginBottom: "1rem" }}
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} / 5
                      </option>
                    ))}
                  </select>
                  <textarea
                    className="form__input"
                    rows="4"
                    maxLength="1000"
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    style={{ marginBottom: "1rem" }}
                  />
                  <button
                    className="btn btn--green"
                    disabled={busy || !draftText.trim()}
                    onClick={() => saveEdit(id)}
                  >
                    Save
                  </button>{" "}
                  <button
                    className="btn btn--small"
                    disabled={busy}
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <p className="reviews__text">{r.review}</p>
                  <Stars rating={r.rating} />
                  <div style={{ marginTop: "1.5rem" }}>
                    <button
                      className="btn btn--small btn--green"
                      disabled={busy}
                      onClick={() => startEdit(r)}
                    >
                      Edit
                    </button>{" "}
                    <button
                      className="btn btn--small"
                      disabled={busy}
                      onClick={() => handleDelete(id)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
