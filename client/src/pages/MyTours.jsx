import { useEffect, useState } from "react";
import TourCard from "../components/TourCard";

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function MyTours() {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const res = await fetch("/api/v1/bookings/my-tours", {
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok)
          throw new Error(json.message || "Could not load your tours");
        if (!ignore) setTours(json.data.doc);
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

  return (
    <main className="main">
      {loading && <p>Loading your tours...</p>}
      {error && <p>{error}</p>}
      {!loading && !error && tours.length === 0 && (
        <p>You have not booked any tours yet.</p>
      )}
      <div className="card-container">
        {tours.map((tour) => (
          <div key={tour._id || tour.id}>
            <TourCard tour={tour} />
            <p style={{ fontSize: "1.4rem", marginTop: "1rem" }}>
              <strong>Booked for: </strong>
              {tour.bookedDates && tour.bookedDates.length > 0
                ? tour.bookedDates.map(formatDate).join(", ")
                : "Date not recorded (older booking)"}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
