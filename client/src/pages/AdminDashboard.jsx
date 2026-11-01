import { useEffect, useState } from "react";

const GREEN = "#55c57a";
const cardStyle = {
  background: "#fff",
  borderRadius: "0.5rem",
  boxShadow: "0 1.5rem 4rem rgba(0, 0, 0, 0.1)",
  padding: "2.5rem 2rem",
};
const chartTitle = {
  fontSize: "1.4rem",
  textTransform: "uppercase",
  letterSpacing: "0.1rem",
  marginBottom: "2rem",
};

// one row per tour: name, a bar as wide as (count / biggest count), and the number
function BookingsPerTourChart({ items }) {
  if (items.length === 0) return <p>No bookings yet.</p>;
  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
      {items.map((item) => (
        <div key={item.name}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "1.3rem",
              marginBottom: "0.4rem",
            }}
          >
            <span>{item.name}</span>
            <strong>{item.count}</strong>
          </div>
          <div style={{ background: "#eee", borderRadius: "0.3rem" }}>
            <div
              style={{
                width: `${(item.count / max) * 100}%`,
                height: "1.2rem",
                background: GREEN,
                borderRadius: "0.3rem",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// 12 vertical bars. The tallest month fills the chart, the rest are scaled against it
function MonthlyRevenueChart({ items }) {
  const W = 600;
  const H = 240;
  const PAD_TOP = 24;
  const PAD_BOTTOM = 28;
  const chartH = H - PAD_TOP - PAD_BOTTOM;
  const max = Math.max(...items.map((i) => i.revenue), 1);
  const slot = W / items.length;
  const barW = slot * 0.6;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      {items.map((item, i) => {
        const barH = (item.revenue / max) * chartH;
        const x = i * slot + (slot - barW) / 2;
        const y = PAD_TOP + chartH - barH;
        return (
          <g key={`${item.label}-${i}`}>
            <title>{`${item.label}: $${item.revenue.toLocaleString("en-US")}`}</title>
            <rect x={x} y={y} width={barW} height={barH} fill={GREEN} rx="3" />
            {item.revenue > 0 && (
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="11"
                fill="#777"
              >
                {`$${Math.round(item.revenue).toLocaleString("en-US")}`}
              </text>
            )}
            <text
              x={x + barW / 2}
              y={H - 8}
              textAnchor="middle"
              fontSize="12"
              fill="#777"
            >
              {item.label}
            </text>
          </g>
        );
      })}
      <line
        x1="0"
        y1={PAD_TOP + chartH}
        x2={W}
        y2={PAD_TOP + chartH}
        stroke="#ddd"
      />
    </svg>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const res = await fetch("/api/v1/bookings/admin-stats", {
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok)
          throw new Error(json.message || "Could not load the dashboard");
        if (!ignore) setData(json.data);
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

  const stats = data ? data.stats : null;
  const cards = stats
    ? [
        { label: "Users", value: stats.users },
        { label: "Tours", value: stats.tours },
        { label: "Bookings", value: stats.bookings },
        {
          label: "Revenue",
          value: `$${stats.revenue.toLocaleString("en-US")}`,
        },
      ]
    : [];

  return (
    <main className="main">
      <div style={{ width: "100%", maxWidth: "110rem", padding: "0 2rem" }}>
        <h2 className="heading-secondary ma-bt-lg">Admin dashboard</h2>

        {loading && <p>Loading...</p>}
        {error && <p>{error}</p>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))",
            gap: "2rem",
          }}
        >
          {cards.map((card) => (
            <div
              key={card.label}
              style={{
                ...cardStyle,
                padding: "3rem 2rem",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: "1.4rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1rem",
                }}
              >
                {card.label}
              </p>
              <p style={{ fontSize: "3.6rem", fontWeight: 700 }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {data && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(32rem, 1fr))",
              gap: "2rem",
              marginTop: "2rem",
            }}
          >
            <div style={cardStyle}>
              <p style={chartTitle}>Bookings per tour</p>
              <BookingsPerTourChart items={data.bookingsPerTour} />
            </div>
            <div style={cardStyle}>
              <p style={chartTitle}>Monthly revenue (last 12 months)</p>
              <MonthlyRevenueChart items={data.monthlyRevenue} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
