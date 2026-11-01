// How many seats are booked per tour and date.
// The server sends rows like { tour, startDate, booked }. We turn them into { "tourId|timestamp": booked }
export async function fetchAvailability(tourId) {
  const url = tourId
    ? `/api/v1/bookings/availability?tour=${tourId}`
    : "/api/v1/bookings/availability";
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Could not load availability");

  const booked = {};
  json.data.doc.forEach((row) => {
    booked[`${row.tour}|${new Date(row.startDate).getTime()}`] = row.booked;
  });
  return booked;
}

export function seatsLeft(tour, booked, date) {
  const key = `${tour.id}|${new Date(date).getTime()}`;
  return Math.max(0, tour.maxGroupSize - (booked[key] || 0));
}

// only the dates that are still in the future, earliest first
export function upcomingDates(tour) {
  const now = Date.now();
  return (tour.startDates || [])
    .filter((d) => new Date(d).getTime() > now)
    .sort((a, b) => new Date(a) - new Date(b));
}
