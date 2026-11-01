import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import TourCard from "../components/TourCard";
import HeroCarousel from "../components/HeroCarousel";
import { fetchAvailability } from "../utils/availability";

const PAGE_SIZE = 6;
const DEFAULT_SORT = "-ratingsAverage";

const SORTS = [
  ["-ratingsAverage", "Top rated"],
  ["price", "Price: low to high"],
  ["-price", "Price: high to low"],
  ["duration", "Shortest first"],
  ["-duration", "Longest first"],
];

const FILTERS = [
  {
    name: "difficulty",
    title: "Difficulty",
    label: "Any difficulty",
    options: [
      ["easy", "Easy"],
      ["medium", "Medium"],
      ["hard", "Hard"],
    ],
  },
  {
    name: "maxPrice",
    title: "Price",
    label: "Any price",
    options: [
      ["500", "Up to $500"],
      ["1000", "Up to $1000"],
      ["1500", "Up to $1500"],
      ["2000", "Up to $2000"],
      ["3000", "Up to $3000"],
    ],
  },
  {
    name: "maxDuration",
    title: "Length",
    label: "Any length",
    options: [
      ["4", "Up to 4 days"],
      ["6", "Up to 6 days"],
      ["8", "Up to 8 days"],
      ["10", "Up to 10 days"],
    ],
  },
  {
    name: "minRating",
    title: "Rating",
    label: "Any rating",
    options: [
      ["4", "4+ stars"],
      ["4.5", "4.5+ stars"],
      ["4.8", "4.8+ stars"],
    ],
  },
];

export default function Overview() {
  const [params, setParams] = useSearchParams();

  // everything the user chose lives in the URL, so a filtered page can be shared and survives a refresh
  const q = params.get("q") ?? "";
  const difficulty = params.get("difficulty") ?? "";
  const maxPrice = params.get("maxPrice") ?? "";
  const maxDuration = params.get("maxDuration") ?? "";
  const minRating = params.get("minRating") ?? "";
  const sort = params.get("sort") ?? DEFAULT_SORT;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const values = { difficulty, maxPrice, maxDuration, minRating };

  const [text, setText] = useState(q); // what is typed in the search box (the URL follows it with a small delay)
  const [booked, setBooked] = useState({});
  const [result, setResult] = useState({
    key: "",
    tours: [],
    total: 0,
    error: "",
  });

  // the Filters dropdown
  const [open, setOpen] = useState(false);
  const filterBoxRef = useRef(null); // wraps the button AND the panel, so a click on the button is not "outside"

  function setParam(name, value) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === "" || (name === "sort" && value === DEFAULT_SORT)) {
        next.delete(name);
      } else {
        next.set(name, value);
      }
      if (name !== "page") next.delete("page"); // a new filter always starts again at page 1
      return next;
    });
  }

  // puts the four filters and the sort back to normal. The search text stays.
  function resetFilters() {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      [
        "difficulty",
        "maxPrice",
        "maxDuration",
        "minRating",
        "sort",
        "page",
      ].forEach((key) => next.delete(key));
      return next;
    });
  }

  // close the dropdown on a click outside it, or on the Escape key
  useEffect(() => {
    if (!open) return undefined;

    function onMouseDown(e) {
      if (filterBoxRef.current && !filterBoxRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // typing: wait until the user stops for 400 ms, then put the text in the URL (so we do not call the server on every letter)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (text === q) return;
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (text) next.set("q", text);
        else next.delete("q");
        next.delete("page");
        return next;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [text, q, setParams]);

  // the question we ask the API
  const apiQuery = useMemo(() => {
    const api = new URLSearchParams();
    if (q) api.set("search", q);
    if (difficulty) api.set("difficulty", difficulty);
    if (maxPrice) api.set("price[lte]", maxPrice);
    if (maxDuration) api.set("duration[lte]", maxDuration);
    if (minRating) api.set("ratingsAverage[gte]", minRating);
    api.set("sort", sort);
    api.set("page", String(page));
    api.set("limit", String(PAGE_SIZE));
    return api.toString();
  }, [q, difficulty, maxPrice, maxDuration, minRating, sort, page]);

  // seats are loaded once for all tours
  useEffect(() => {
    let ignore = false;
    fetchAvailability()
      .then((availability) => {
        if (!ignore) setBooked(availability);
      })
      .catch(() => {}); // seats are a bonus, the page works without them
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadTours() {
      try {
        const res = await fetch(`/api/v1/tours?${apiQuery}`, {
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Could not load tours");
        if (!ignore) {
          setResult({
            key: apiQuery,
            tours: json.data.doc,
            total: json.total ?? json.data.doc.length,
            error: "",
          });
        }
      } catch (err) {
        if (!ignore) {
          setResult({ key: apiQuery, tours: [], total: 0, error: err.message });
        }
      }
    }

    loadTours();
    return () => {
      ignore = true;
    };
  }, [apiQuery]);

  const loading = result.key !== apiQuery; // the answer on screen belongs to an older question
  const { tours, total, error } = result;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtersActive = Boolean(
    q || difficulty || maxPrice || maxDuration || minRating,
  );

  // the number on the Filters button: the four filters plus the sort, when it is not the default
  const activeCount =
    FILTERS.filter((f) => values[f.name] !== "").length +
    (sort !== DEFAULT_SORT ? 1 : 0);

  function goToPage(n) {
    setParam("page", n === 1 ? "" : String(n));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="main">
      {/* the carousel only shows on the plain first page, not while searching or filtering */}
      {!filtersActive && page === 1 && <HeroCarousel />}

      <div className="toolbar">
        <div className="toolbar__bar">
          <input
            className="toolbar__search"
            type="search"
            placeholder="Search tours by name..."
            aria-label="Search tours by name"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="toolbar__filter-box" ref={filterBoxRef}>
            <button
              type="button"
              className={`toolbar__filter-btn${
                activeCount > 0 ? " toolbar__filter-btn--active" : ""
              }`}
              aria-expanded={open}
              aria-haspopup="true"
              onClick={() => setOpen((o) => !o)}
            >
              Filters
              {activeCount > 0 && (
                <span className="toolbar__badge">{activeCount}</span>
              )}
              <span className="toolbar__arrow" aria-hidden="true">
                {open ? "\u25B4" : "\u25BE"}
              </span>
            </button>

            {open && (
              <div className="toolbar__panel">
                {FILTERS.map((f) => (
                  <div key={f.name} className="toolbar__field">
                    <label
                      className="toolbar__field-label"
                      htmlFor={`filter-${f.name}`}
                    >
                      {f.title}
                    </label>
                    <select
                      id={`filter-${f.name}`}
                      className="toolbar__select"
                      value={values[f.name]}
                      onChange={(e) => setParam(f.name, e.target.value)}
                    >
                      <option value="">{f.label}</option>
                      {f.options.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                <div className="toolbar__field">
                  <label className="toolbar__field-label" htmlFor="filter-sort">
                    Sort by
                  </label>
                  <select
                    id="filter-sort"
                    className="toolbar__select"
                    value={sort}
                    onChange={(e) => setParam("sort", e.target.value)}
                  >
                    {SORTS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {activeCount > 0 && (
                  <button
                    type="button"
                    className="toolbar__reset"
                    onClick={resetFilters}
                  >
                    Reset filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="toolbar__count">
          {loading
            ? "Searching..."
            : `${total} ${total === 1 ? "tour" : "tours"} found`}
        </p>
      </div>

      {!loading && error && <p className="toolbar__message">{error}</p>}

      {!loading && !error && tours.length === 0 && (
        <div className="toolbar__message">
          {total > 0 ? (
            <>
              <p>There are no tours on this page.</p>
              <button
                type="button"
                className="btn btn--green btn--small"
                onClick={() => goToPage(1)}
              >
                Go to the first page
              </button>
            </>
          ) : (
            <p>No tours match your search. Try other words or filters.</p>
          )}
        </div>
      )}

      <div
        className="card-container"
        style={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}
      >
        {tours.map((tour) => (
          <TourCard key={tour._id || tour.id} tour={tour} booked={booked} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            className="btn btn--green btn--small"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            Previous
          </button>
          <span className="pagination__info">{`Page ${page} of ${totalPages}`}</span>
          <button
            type="button"
            className="btn btn--green btn--small"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
