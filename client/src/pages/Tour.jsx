import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TourMap from "../components/TourMap";
import ReviewCard from "../components/ReviewCard";
import ReviewForm from "../components/ReviewForm";
import ErrorPage from "../components/ErrorPage";
import { useAlert } from "../context/AlertContext";
import {
  fetchAvailability,
  seatsLeft,
  upcomingDates,
} from "../utils/availability";

function OverviewBox({ label, text, icon }) {
  return (
    <div className="overview-box__detail">
      <svg className="overview-box__icon">
        <use href={`/img/icons.svg#icon-${icon}`} />
      </svg>
      <span className="overview-box__label">{label}</span>
      <span className="overview-box__text">{text}</span>
    </div>
  );
}

const formatDate = (d) =>
  new Date(d).toLocaleString("en-us", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export default function Tour() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [booking, setBooking] = useState(false);
  const [tour, setTour] = useState(null);
  const [booked, setBooked] = useState({});
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // bumped after a new review, so the tour (reviews + rating) is loaded again
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadTour() {
      try {
        const res = await fetch(`/api/v1/tours/slug/${slug}`, {
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Could not load tour");
        const loaded = json.data.data;
        if (!ignore) {
          setTour(loaded);
          document.title = `Natours | ${loaded.name} Tour`;
        }

        // seats load in the background, the page does not wait for them
        fetchAvailability(loaded.id)
          .then((availability) => {
            if (!ignore) setBooked(availability);
          })
          .catch(() => {});
      } catch (err) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadTour();
    return () => {
      ignore = true;
    };
  }, [slug, reloadKey]);

  if (loading)
    return (
      <main className="main">
        <p>Loading tour...</p>
      </main>
    );
  if (error || !tour) return <ErrorPage msg={error || "Tour not found"} />;

  // the dates that are still in the future, and the one that is selected (the first free date if the user has not clicked yet)
  const dates = upcomingDates(tour);
  const firstFreeDate = dates.find((d) => seatsLeft(tour, booked, d) > 0) || "";
  const chosenDate = selectedDate || firstFreeDate;

  async function handleBook() {
    if (!chosenDate) return;
    setBooking(true);
    try {
      const res = await fetch(
        `/api/v1/bookings/checkout-session/${tour.id}?date=${encodeURIComponent(chosenDate)}`,
        { credentials: "include" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not start checkout");
      window.location.href = json.session.url;
    } catch (err) {
      showAlert("error", err.message);
      setBooking(false);
    }
  }

  const nextDate = dates[0]
    ? new Date(dates[0]).toLocaleString("en-us", {
        month: "long",
        year: "numeric",
      })
    : "TBA";

  let bookLabel = "Book tour now!";
  if (dates.length === 0) bookLabel = "No dates available";
  else if (!chosenDate) bookLabel = "Sold out";
  else if (booking) bookLabel = "Processing...";

  return (
    <>
      <section className="section-header">
        <div className="header__hero">
          <div className="header__hero-overlay">&nbsp;</div>
          <img
            className="header__hero-img"
            src={`/img/tours/${tour.imageCover}`}
            alt={tour.name}
          />
        </div>

        <div className="heading-box">
          <h1 className="heading-primary">
            <span>{`${tour.name} tour`}</span>
          </h1>
          <div className="heading-box__group">
            <div className="heading-box__detail">
              <svg className="heading-box__icon">
                <use href="/img/icons.svg#icon-clock" />
              </svg>
              <span className="heading-box__text">{`${tour.duration} days`}</span>
            </div>
            <div className="heading-box__detail">
              <svg className="heading-box__icon">
                <use href="/img/icons.svg#icon-map-pin" />
              </svg>
              <span className="heading-box__text">
                {tour.startLocation.description}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="section-description">
        <div className="overview-box">
          <div>
            <div className="overview-box__group">
              <h2 className="heading-secondary ma-bt-lg">Quick facts</h2>
              <OverviewBox label="Next date" text={nextDate} icon="calendar" />
              <OverviewBox
                label="Difficulty"
                text={tour.difficulty}
                icon="trending-up"
              />
              <OverviewBox
                label="Participants"
                text={`${tour.maxGroupSize} people`}
                icon="user"
              />
              <OverviewBox
                label="Rating"
                text={`${tour.ratingsAverage} / 5`}
                icon="star"
              />
            </div>

            <div className="overview-box__group">
              <h2 className="heading-secondary ma-bt-lg">Your tour guides</h2>
              {tour.guides.map((guide) => (
                <div className="overview-box__detail" key={guide._id}>
                  <img
                    className="overview-box__img"
                    src={`/img/users/${guide.photo}`}
                    alt={guide.name}
                  />
                  {guide.role === "lead-guide" && (
                    <span className="overview-box__label">Lead guide</span>
                  )}
                  {guide.role === "guide" && (
                    <span className="overview-box__label">Tour guide</span>
                  )}
                  <span className="overview-box__text">{guide.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="description-box">
          <h2 className="heading-secondary ma-bt-lg">{`About ${tour.name} tour`}</h2>
          {tour.description.split("\n").map((p, i) => (
            <p className="description__text" key={i}>
              {p}
            </p>
          ))}
        </div>
      </section>

      <section className="section-pictures">
        {tour.images.map((img, i) => (
          <div className="picture-box" key={img}>
            <img
              className={`picture-box__img picture-box__img--${i + 1}`}
              src={`/img/tours/${img}`}
              alt={`${tour.name} ${i + 1}`}
            />
          </div>
        ))}
      </section>

      <section className="section-map">
        <TourMap locations={tour.locations} />
      </section>

      <section className="section-reviews">
        <div className="reviews">
          {(tour.reviews ?? []).map((review) => (
            <ReviewCard key={review.id || review._id} review={review} />
          ))}
        </div>
        <ReviewForm
          tourId={tour.id}
          onSaved={() => setReloadKey((k) => k + 1)}
        />
      </section>

      <section className="section-dates">
        <h2 className="heading-secondary ma-bt-lg">Choose your date</h2>
        {dates.length === 0 ? (
          <p>No upcoming dates for this tour right now.</p>
        ) : (
          <div className="date-picker">
            {dates.map((d) => {
              const left = seatsLeft(tour, booked, d);
              const isSoldOut = left === 0;
              const isActive = d === chosenDate;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={isSoldOut}
                  className={`date-chip${isActive ? " date-chip--active" : ""}${isSoldOut ? " date-chip--soldout" : ""}`}
                  onClick={() => setSelectedDate(d)}
                >
                  <span className="date-chip__date">{formatDate(d)}</span>
                  <span className="date-chip__seats">
                    {isSoldOut ? "Sold out" : `${left} seats left`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="section-cta">
        <div className="cta">
          <div className="cta__img cta__img--logo">
            <img src="/img/logo-white.png" alt="Natours logo" />
          </div>
          <img
            className="cta__img cta__img--1"
            src={`/img/tours/${tour.images[1]}`}
            alt="Tour"
          />
          <img
            className="cta__img cta__img--2"
            src={`/img/tours/${tour.images[2]}`}
            alt="Tour"
          />
          <div className="cta__content">
            <h2 className="heading-secondary">What are you waiting for?</h2>
            <p className="cta__text">
              {`${tour.duration} days. 1 adventure. Infinite memories. Make it yours today!`}
            </p>
            {user ? (
              <button
                className="btn btn--green span-all-rows"
                id="book-tour"
                onClick={handleBook}
                disabled={booking || !chosenDate}
              >
                {bookLabel}
              </button>
            ) : (
              <Link className="btn btn--green span-all-rows" to="/login">
                Login to book tour
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
