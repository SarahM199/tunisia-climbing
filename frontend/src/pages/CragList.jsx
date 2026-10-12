import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GridSkeleton } from "../components/Skeleton";
import AboutClimbing from "../components/AboutClimbing";

// Import the hero image — Vite will handle the path for us
import heroBg from "../assets/hero-bg.jpeg";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function CragCard({ crag }) {
  return (
    <Link to={`/crags/${crag.id}`} className="crag-card">
      <div className="crag-card-header">
        <h2>{crag.name}</h2>
        {crag.rock_type && <span className="rock-type">{crag.rock_type}</span>}
      </div>
      {crag.region && <p className="region">{crag.region}, Tunisia</p>}
    </Link>
  );
}

function scoreClass(label) {
  if (label === "Excellent") return "score-excellent";
  if (label === "Good") return "score-good";
  if (label === "Marginal") return "score-marginal";
  return "score-poor";
}

function CragList() {
  const [crags, setCrags] = useState([]);
  const [status, setStatus] = useState("loading");
  const [searchText, setSearchText] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [stats, setStats] = useState(null);
  const [bestToday, setBestToday] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/crags`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setCrags(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  // Fetch stats (crag/sector/route counts) for the stats bar
  useEffect(() => {
    fetch(`${API_URL}/stats`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {}); // silently fail — stats are not critical
  }, []);

  // Fetch today's best sectors
  useEffect(() => {
    fetch(`${API_URL}/best-today`)
      .then((res) => res.json())
      .then((data) => setBestToday(data))
      .catch(() => {}); // non-critical, fail silently
  }, []);

  const regions = [...new Set(crags.map((c) => c.region).filter(Boolean))].sort();

  const filtered = crags.filter((c) => {
    if (searchText) {
      const q = searchText.toLowerCase();
      if (!c.name?.toLowerCase().includes(q) && !c.region?.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (regionFilter && c.region !== regionFilter) return false;
    return true;
  });

  return (
    <>
      {/*
        HERO SECTION
        This sits outside the normal .page padding.
        The image is set as a CSS background with a dark overlay gradient
        so white text stays readable on any photo.
      */}
      <section
        className="hero"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        {/* The overlay is a gradient from dark to transparent */}
        <div className="hero-overlay">
          <span className="hero-eyebrow">Tunisia</span>
          <h1 className="hero-title">Climbing Crags</h1>
          <p className="hero-subtitle">
            Limestone cliffs, sea cliffs, and desert walls — mapped for climbers.
          </p>
        </div>
      </section>

      {/* STATS BAR — shows total counts */}
      {stats && (
        <div className="stats-bar">
          <div className="stat">
            <span className="stat-number">{stats.crags}</span>
            <span className="stat-label">Crags</span>
          </div>
          <div className="stat">
            <span className="stat-number">{stats.sectors}</span>
            <span className="stat-label">Sectors</span>
          </div>
          <div className="stat">
            <span className="stat-number">{stats.routes}</span>
            <span className="stat-label">Routes</span>
          </div>
        </div>
      )}
           {/* BEST TODAY — top sectors right now */}
      {bestToday && bestToday.top_sectors && bestToday.top_sectors.length > 0 && (
        <section className="best-today">
          <h2 className="best-today-title">Best sectors right now</h2>
          <div className="best-today-grid">
            {bestToday.top_sectors.map((sector) => (
              <Link
                to={`/sectors/${sector.sector_id}`}
                key={sector.sector_id}
                className={`best-today-card ${scoreClass(sector.label)}`}
              >
                <span className={`condition-badge ${scoreClass(sector.label)}`}>
                  {sector.label}
                </span>
                <h3>{sector.sector_name}</h3>
                <p className="best-today-crag">{sector.crag_name}</p>
                {sector.grade_min && sector.grade_max && (
                  <span className="grade-badge">{sector.grade_min} – {sector.grade_max}</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}


      {/* REST OF THE PAGE — filters and grid */}
      <main>
        {status === "loading" && <GridSkeleton count={6} />}
        {status === "error" && (
          <p className="status-message error">
            Couldn't reach the API. Is the backend running?
          </p>
        )}

        {status === "ready" && (
          <>
            <div className="filter-bar">
              <div className="form-field">
                <label htmlFor="crag-search">Search</label>
                <input
                  id="crag-search"
                  type="text"
                  placeholder="Crag name or region…"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="crag-region">Region</label>
                <select
                  id="crag-region"
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                >
                  <option value="">All regions</option>
                  {regions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="filter-count">
              Showing {filtered.length} of {crags.length} crags
            </p>

            {filtered.length === 0 && (
              <p className="status-message">No crags match your filters.</p>
            )}

                       {filtered.length > 0 && (
              <div className="crag-grid">
                {filtered.map((crag) => (
                  <CragCard key={crag.id} crag={crag} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Teaser below the crag grid — people looking for a crag get
            what they came for first */}
        <AboutClimbing stats={stats} />
      </main>

    </>
  );
}

export default CragList;
