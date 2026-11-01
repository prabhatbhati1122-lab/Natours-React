import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./HeroCarousel.css";

const SLIDE_COUNT = 5;
const INTERVAL_MS = 5000;

export default function HeroCarousel() {
  const [slides, setSlides] = useState([]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // the best rated tours become the slides
  useEffect(() => {
    let ignore = false;
    fetch(`/api/v1/tours?sort=-ratingsAverage&limit=${SLIDE_COUNT}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((json) => {
        if (!ignore && json.data?.doc) setSlides(json.data.doc);
      })
      .catch(() => {}); // the carousel is a bonus, the page works without it
    return () => {
      ignore = true;
    };
  }, []);

  // change the slide every few seconds (not while the mouse is on it)
  useEffect(() => {
    if (paused || slides.length < 2) return undefined;
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused, slides.length]);

  if (slides.length === 0) return null;

  return (
    <section
      className="hero"
      aria-label="Top rated tours"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((tour, i) => (
        <div
          key={tour._id || tour.id}
          className={`hero__slide${i === active ? " hero__slide--active" : ""}`}
          aria-hidden={i !== active}
        >
          <img
            className="hero__img"
            src={`/img/tours/${tour.imageCover}`}
            alt={tour.name}
          />
          <div className="hero__overlay" />
          <div className="hero__content">
            <p className="hero__label">Top rated</p>
            <h2 className="hero__title">{tour.name}</h2>
            <p className="hero__summary">{tour.summary}</p>
            <Link
              className="hero__link"
              to={`/tour/${tour.slug}`}
              tabIndex={i === active ? 0 : -1}
            >
              View tour
            </Link>
          </div>
        </div>
      ))}

      <div className="hero__dots">
        {slides.map((tour, i) => (
          <button
            key={tour._id || tour.id}
            type="button"
            className={`hero__dot${i === active ? " hero__dot--active" : ""}`}
            aria-label={`Show ${tour.name}`}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </section>
  );
}
