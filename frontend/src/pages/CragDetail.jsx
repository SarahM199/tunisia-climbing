import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PhotoGallery from "../components/PhotoGallery";
import RatingStars from "../components/RatingStars";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function scoreClass(label) {
  if (label === "Excellent") return "score-excellent";
  if (label === "Good") return "score-good";
  if (label === "Marginal") return "score-marginal";
  return "score-poor";
}

function DayCard({ day }) {
  const date = new Date(day.date);
  const dayLabel = date.toLocaleDateString(undefined, { weekday: "short" });
  const dateLabel = date.toLocaleDateString(undefined, { day: "numeric", month: "short" });

  return (
    <div className={`day-card ${scoreClass(day.label)}`}>
      <span className="day-name">{dayLabel}</span>
      <span className="day-date">{dateLabel}</span>
      <span className="day-temp">{Math.round(day.temp_max_c)}°</span>
      <span className="day-badge">{day.label}</span>
    </div>
  );
}

function ForecastStrip({ forecast }) {
  if (!forecast || forecast.length === 0) return null;
  return (
    <div className="forecast-strip">
      {forecast.map((day) => (
        <DayCard key={day.date} day={day} />
      ))}
    </div>
  );
}

/*
  RouteTable — displays the list of routes for a sector in a table.
  Each route shows its number, name, grade, and quickdraw count.
*/
function RouteTable({ routes }) {
  if (!routes || routes.length === 0) {
    return <p className="status-message">No routes recorded for this sector.</p>;
  }

  return (
    <table className="route-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Grade</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        {routes.map((route) => (
          <tr key={route.id}>
            <td className="route-number">{route.route_number}</td>
            <td className="route-name">{route.name}</td>
            <td><span className="grade-badge">{route.grade}</span></td>
            <td className="route-type">{route.climbing_type || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/*
  SectorRow — now clickable!

  When you click a sector, it:
  1. Sets "expanded" to true (toggles open/closed)
  2. Fetches routes from /sectors/{id} the first time you expand it
  3. Caches the routes so it doesn't re-fetch if you close and reopen
*/
function SectorRow({ sector, sectorForecast }) {
  const [expanded, setExpanded] = useState(false);
  const [routes, setRoutes] = useState(null);
  const [routeStatus, setRouteStatus] = useState("idle"); // idle | loading | ready | error

  const gradeLabel =
    sector.grade_min && sector.grade_max && sector.grade_min !== sector.grade_max
      ? `${sector.grade_min} – ${sector.grade_max}`
      : sector.grade_min || sector.grade_max;

  const today = sectorForecast?.forecast?.[0];

  function handleClick() {
    // Toggle expanded state
    setExpanded(!expanded);

    // Only fetch routes the first time we expand (when routes is still null)
    if (!expanded && routes === null) {
      setRouteStatus("loading");
      fetch(`${API_URL}/sectors/${sector.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setRoutes(data.routes);
          setRouteStatus("ready");
        })
        .catch(() => setRouteStatus("error"));
    }
  }

  return (
    <div className={`sector-card ${expanded ? "sector-card--expanded" : ""}`}>
      {/* The clickable header area */}
      <button className="sector-row" onClick={handleClick} type="button">
        <div className="sector-row-main">
          <h3>
            {/* Arrow rotates when expanded */}
            <span className={`sector-arrow ${expanded ? "sector-arrow--open" : ""}`}>
              ▶
            </span>
            {sector.name}
          </h3>
            <div className="sector-meta">
            {sector.climbing_type && <span className="tag">{sector.climbing_type}</span>}
            {gradeLabel && <span className="grade-badge">{gradeLabel}</span>}
            {sector.num_routes != null && (
              <span className="route-count">{sector.num_routes} routes</span>
            )}
            {/* Renders nothing when the sector has no ratings yet */}
            <RatingStars value={sector.rating} count={sector.rating_count} />
          </div>

        </div>

        {today && (
          <div className={`sector-today ${scoreClass(today.label)}`}>
            <span className="sector-today-label">{today.label} today</span>
            {today.shade_by_hour != null && (
              <span className="sector-shade-note">
                {today.shade_data_source === "measured" ? "Shaded" : "Est. shade"} by{" "}
                {today.shade_by_hour}:00
              </span>
            )}
          </div>
        )}
      </button>

      {/* The expanded routes section — only shows when expanded is true */}
      {expanded && (
        <div className="sector-routes">
          {routeStatus === "loading" && <p className="status-message">Loading routes…</p>}
          {routeStatus === "error" && (
            <p className="status-message error">Couldn't load routes.</p>
          )}
          {routeStatus === "ready" && <RouteTable routes={routes} />}
          <Link to={`/sectors/${sector.id}`} className="cta-link" style={{ marginTop: "12px", display: "inline-block" }}>
            View full sector page →
          </Link>
        </div>
      )}
    </div>
  );
}

function CragDetail() {
  const { cragId } = useParams();
  const [crag, setCrag] = useState(null);
  const [status, setStatus] = useState("loading");
  const [forecast, setForecast] = useState(null);
  const [forecastStatus, setForecastStatus] = useState("loading");

  useEffect(() => {
    setStatus("loading");
    fetch(`${API_URL}/crags/${cragId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setCrag(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [cragId]);

  useEffect(() => {
    setForecastStatus("loading");
    fetch(`${API_URL}/crags/${cragId}/forecast`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setForecast(data);
        setForecastStatus("ready");
      })
      .catch(() => setForecastStatus("error"));
  }, [cragId]);

  const sectorForecastById = {};
  if (forecast?.sectors) {
    for (const sf of forecast.sectors) {
      sectorForecastById[sf.sector_id] = sf;
    }
  }

  return (
    <>
      {status === "loading" && <p className="status-message">Loading…</p>}
      {status === "error" && <p className="status-message error">Couldn't load this crag.</p>}

      {status === "ready" && crag && (
        <>
          <header className="site-header">
            <span className="eyebrow">{crag.region ? `${crag.region}, Tunisia` : "Tunisia"}</span>
            <h1>{crag.name}</h1>
            {crag.description && <p className="tagline">{crag.description}</p>}
            <div className="crag-facts">
              {crag.rock_type && <span className="tag">{crag.rock_type}</span>}
              {crag.altitude_m && <span className="tag">{crag.altitude_m}m altitude</span>}
            </div>
          </header>

          {/* Crag photos */}
          <PhotoGallery basePath="/photos/crags" id={cragId} maxExtras={4} />

          <main>
            <h2 className="section-title">This week's conditions</h2>
            {forecastStatus === "loading" && <p className="status-message">Loading forecast…</p>}
            {forecastStatus === "error" && (
              <p className="status-message error">Forecast unavailable for this crag.</p>
            )}
            {forecastStatus === "ready" && <ForecastStrip forecast={forecast.crag_forecast} />}

            <h2 className="section-title" style={{ marginTop: "40px" }}>
              Sectors ({crag.sectors.length})
            </h2>
            <p className="sector-hint">Click a sector to see its routes</p>
            {crag.sectors.length === 0 && (
              <p className="status-message">No sectors recorded yet for this crag.</p>
            )}
            <div className="sector-list">
              {crag.sectors.map((sector) => (
                <SectorRow
                  key={sector.id}
                  sector={sector}
                  sectorForecast={sectorForecastById[sector.id]}
                />
              ))}
            </div>
          </main>
        </>
      )}
    </>
  );
}

export default CragDetail;

/*
  GradeChart — a simple bar chart showing the grade range of each sector.
  Uses pure CSS bars — width is proportional to route count.
*/
function GradeChart({ sectors }) {
  if (!sectors || sectors.length === 0) return null;

  // Find the max route count for scaling
  const maxRoutes = Math.max(...sectors.map((s) => s.num_routes || 0));
  if (maxRoutes === 0) return null;

  return (
    <div className="grade-chart">
      <h2 className="section-title" style={{ marginTop: "40px" }}>
        Sectors by size
      </h2>
      {sectors.map((sector) => (
        <div key={sector.id} className="grade-bar-row">
          <span className="grade-bar-label">{sector.name}</span>
          <div className="grade-bar-track">
            {/* Width = percentage of the largest sector */}
            <div
              className="grade-bar-fill"
              style={{ width: `${((sector.num_routes || 0) / maxRoutes) * 100}%` }}
            />
          </div>
          <span className="grade-bar-count">{sector.num_routes || 0}</span>
        </div>
      ))}
    </div>
  );
}
