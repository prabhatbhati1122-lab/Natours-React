import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const PAGE_SIZE = 20;
const cell = { padding: "1rem 1.2rem", textAlign: "left", fontSize: "1.4rem" };

export default function AdminTours() {
  const [tours, setTours] = useState([]);
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
          `/api/v1/tours?sort=name&limit=${PAGE_SIZE}&page=${page}`,
          { credentials: "include" },
        );
        const json = await res.json();
        if (!res.ok)
          throw new Error(json.message || "Could not load the tours");
        if (!ignore) {
          setTours(json.data.doc);
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
        <h2 className="heading-secondary ma-bt-lg">Tours ({total})</h2>
        <p style={{ marginBottom: "2rem" }}>
          <Link to="/admin" className="btn-text">
            &larr; Back to dashboard
          </Link>
        </p>

        {loading && <p>Loading...</p>}
        {error && <p>{error}</p>}

        {!error && tours.length > 0 && (
          <div style={{ overflowX: "auto", background: "#fff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #ddd" }}>
                  <th style={cell}>Name</th>
                  <th style={cell}>Price</th>
                  <th style={cell}>Duration</th>
                  <th style={cell}>Difficulty</th>
                  <th style={cell}>Group size</th>
                  <th style={cell}>Rating</th>
                  <th style={cell}></th>
                </tr>
              </thead>
              <tbody>
                {tours.map((t) => (
                  <tr
                    key={t._id || t.id}
                    style={{ borderBottom: "1px solid #eee" }}
                  >
                    <td style={cell}>{t.name}</td>
                    <td style={cell}>${t.price}</td>
                    <td style={cell}>{t.duration} days</td>
                    <td style={cell}>{t.difficulty}</td>
                    <td style={cell}>{t.maxGroupSize}</td>
                    <td style={cell}>{t.ratingsAverage}</td>
                    <td style={cell}>
                      <Link to={`/tour/${t.slug}`} className="btn-text">
                        View
                      </Link>
                    </td>
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
