import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const PAGE_SIZE = 20;

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

const cell = { padding: "1rem 1.2rem", textAlign: "left", fontSize: "1.4rem" };

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/v1/bookings?sort=-createdAt&limit=${PAGE_SIZE}&page=${page}`,
          { credentials: "include" },
        );
        const json = await res.json();
        if (!res.ok)
          throw new Error(json.message || "Could not load the bookings");
        if (!ignore) {
          setBookings(json.data.doc);
          setTotal(json.total ?? json.data.doc.length);
        }
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
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="main">
      <div style={{ width: "100%", maxWidth: "110rem", padding: "0 2rem" }}>
        <h2 className="heading-secondary ma-bt-lg">Bookings ({total})</h2>
        <p style={{ marginBottom: "2rem" }}>
          <Link to="/admin" className="btn-text">
            &larr; Back to dashboard
          </Link>
        </p>

        {loading && <p>Loading...</p>}
        {error && <p>{error}</p>}

        {!loading && !error && bookings.length === 0 && <p>No bookings yet.</p>}

        {!error && bookings.length > 0 && (
          <div style={{ overflowX: "auto", background: "#fff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #ddd" }}>
                  <th style={cell}>User</th>
                  <th style={cell}>Tour</th>
                  <th style={cell}>Start date</th>
                  <th style={cell}>Seat</th>
                  <th style={cell}>Price</th>
                  <th style={cell}>Booked on</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr
                    key={b._id || b.id}
                    style={{ borderBottom: "1px solid #eee" }}
                  >
                    <td style={cell}>
                      {b.user
                        ? `${b.user.name} (${b.user.email})`
                        : "Deleted user"}
                    </td>
                    <td style={cell}>
                      {b.tour ? b.tour.name : "Deleted tour"}
                    </td>
                    <td style={cell}>{formatDate(b.startDate)}</td>
                    <td style={cell}>{b.seatNumber ?? "-"}</td>
                    <td style={cell}>${b.price}</td>
                    <td style={cell}>{formatDate(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              gap: "2rem",
              alignItems: "center",
              marginTop: "2rem",
            }}
          >
            <button
              className="btn btn--small btn--green"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn--small btn--green"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
