import { Link } from "react-router-dom";
import { seatsLeft, upcomingDates } from "../utils/availability";

export default function TourCard({ tour, booked = {} }) {
  const dates = upcomingDates(tour);
  const firstDate = dates[0]
    ? new Date(dates[0]).toLocaleString("en-us", {
        month: "long",
        year: "numeric",
      })
    : "No upcoming dates";

  const left = dates.map((d) => seatsLeft(tour, booked, d));
  const soldOut = dates.length > 0 && left.every((n) => n === 0);
  const seatsOnNextOpenDate = left.find((n) => n > 0);
  const fewLeft =
    !soldOut && seatsOnNextOpenDate !== undefined && seatsOnNextOpenDate <= 5;

  return (
    <div className="card">
      <div className="card__header">
        <div className="card__picture">
          <div className="card__picture-overlay">&nbsp;</div>
          <img
            className="card__picture-img"
            src={`/img/tours/${tour.imageCover}`}
            alt={tour.name}
          />
          {soldOut && <div className="card__ribbon">Sold out</div>}
          {fewLeft && (
            <div className="card__ribbon card__ribbon--few">
              {`Only ${seatsOnNextOpenDate} seats left`}
            </div>
          )}
        </div>
        <h3 className="heading-tertirary">
          <span>{tour.name}</span>
        </h3>
      </div>

      <div className="card__details">
        <h4 className="card__sub-heading">{`${tour.difficulty} ${tour.duration}-day tour`}</h4>
        <p className="card__text">{tour.summary}</p>

        <div className="card__data">
          <svg className="card__icon">
            <use href="/img/icons.svg#icon-map-pin" />
          </svg>
          <span>{tour.startLocation.description}</span>
        </div>
        <div className="card__data">
          <svg className="card__icon">
            <use href="/img/icons.svg#icon-calendar" />
          </svg>
          <span>{firstDate}</span>
        </div>
        <div className="card__data">
          <svg className="card__icon">
            <use href="/img/icons.svg#icon-flag" />
          </svg>
          <span>{`${tour.locations.length} stops`}</span>
        </div>
        <div className="card__data">
          <svg className="card__icon">
            <use href="/img/icons.svg#icon-user" />
          </svg>
          <span>{`${tour.maxGroupSize} people`}</span>
        </div>
      </div>

      <div className="card__footer">
        <p>
          <span className="card__footer-value">{`$${tour.price}`}</span>{" "}
          <span className="card__footer-text">per person</span>
        </p>
        <p className="card__ratings">
          <span className="card__footer-value">{tour.ratingsAverage}</span>{" "}
          <span className="card__footer-text">{`rating (${tour.ratingsQuantity})`}</span>
        </p>
        <Link to={`/tour/${tour.slug}`} className="btn btn--green btn--small">
          Details
        </Link>
      </div>
    </div>
  );
}
