import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/*
  GRADE_ORDER — used to sort climbing grades properly.

  Climbing grades aren't alphabetical ("6a" < "6b" < "6c" < "7a").
  This array defines the correct order so we can sort routes by difficulty.
  We use indexOf() to compare grades numerically.
*/
const GRADE_ORDER = [
  "3a", "3b", "3c",
  "4a", "4a+", "4b", "4b+", "4c", "4c+",
  "5a", "5a+", "5b", "5b+", "5c", "5c+",
  "6a", "6a+", "6b", "6b+", "6c", "6c+",
  "7a", "7a+", "7b", "7b+", "7c", "7c+",
  "8a", "8a+", "8b", "8b+", "8c", "8c+",
  "9a", "9a+", "9b", "9b+",
];

function gradeIndex(grade) {
  // Returns a number for sorting. Unknown grades go to the end.
  const idx = GRADE_ORDER.indexOf(grade?.toLowerCase());
  return idx === -1 ? 999 : idx;
}

function AllRoutes() {
  const [routes, setRoutes] = useState([]);
  const [status, setStatus] = useState("loading");

  // Filter state — each filter is controlled by a form input
  const [searchText, setSearchText] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [cragFilter, setCragFilter] = useState("");

  // Fetch all routes once on page load
  useEffect(() => {
    fetch(`${API_URL}/routes`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setRoutes(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  /*
    Extract unique values for the filter dropdowns.
    Set() removes duplicates, then we sort alphabetically.
    .filter(Boolean) removes null/undefined values.
  */
  const regions = [...new Set(routes.map((r) => r.region).filter(Boolean))].sort();
  const crags = [...new Set(routes.map((r) => r.crag_name).filter(Boolean))].sort();
  const grades = [...new Set(routes.map((r) => r.grade).filter(Boolean))].sort(
    (a, b) => gradeIndex(a) - gradeIndex(b)
  );

  /*
    Filter the routes based on current filter state.
    .filter() returns a NEW array with only items that pass all conditions.
    Every condition must be true for a route to show up.
  */
  const filtered = routes.filter((r) => {
    // Text search — matches route name, crag name, or sector name
    if (searchText) {
      const q = searchText.toLowerCase();
      const matches =
        r.name?.toLowerCase().includes(q) ||
        r.crag_name?.toLowerCase().includes(q) ||
        r.sector_name?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    // Grade dropdown
    if (gradeFilter && r.grade !== gradeFilter) return false;
    // Region dropdown
    if (regionFilter && r.region !== regionFilter) return false;
    // Crag dropdown
    if (cragFilter && r.crag_name !== cragFilter) return false;

    return true;
  });

  // Sort filtered routes by grade (easiest first)
  const sorted = [...filtered].sort((a, b) => gradeIndex(a.grade) - gradeIndex(b.grade));

  return (
    <>
      <header className="site-header">
        <span className="eyebrow">Browse</span>
        <h1>All Routes</h1>
        <p className="tagline">
          {routes.length} routes across Tunisia — filter by grade, region, or crag.
        </p>
      </header>

      <main>
        {/* FILTER BAR */}
        <div className="filter-bar">
          {/* Text search */}
          <div className="form-field">
            <label htmlFor="search">Search</label>
            <input
              id="search"
              type="text"
              placeholder="Route, crag, or sector name…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          {/* Grade dropdown */}
          <div className="form-field">
            <label htmlFor="grade-filter">Grade</label>
            <select
              id="grade-filter"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
            >
              <option value="">All grades</option>
              {grades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Region dropdown */}
          <div className="form-field">
            <label htmlFor="region-filter">Region</label>
            <select
              id="region-filter"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
            >
              <option value="">All regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Crag dropdown */}
          <div className="form-field">
            <label htmlFor="crag-filter">Crag</label>
            <select
              id="crag-filter"
              value={cragFilter}
              onChange={(e) => setCragFilter(e.target.value)}
            >
              <option value="">All crags</option>
              {crags.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* RESULTS COUNT */}
        <p className="filter-count">
          Showing {sorted.length} of {routes.length} routes
        </p>

        {/* STATUS MESSAGES */}
        {status === "loading" && <p className="status-message">Loading routes…</p>}
        {status === "error" && (
          <p className="status-message error">
            Couldn't load routes. Is the backend running?
          </p>
        )}

        {/* ROUTE TABLE */}
        {status === "ready" && sorted.length > 0 && (
          <table className="route-table route-table--full">
            <thead>
              <tr>
                <th>Route</th>
                <th>Grade</th>
                <th>Crag</th>
                <th>Sector</th>
                <th>Region</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((route) => (
                <tr key={route.id}>
                  <td className="route-name">
                    <Link to={`/crags/${route.crag_id}`}>{route.name}</Link>
                  </td>
                  <td><span className="grade-badge">{route.grade}</span></td>
                  <td>
                    <Link to={`/crags/${route.crag_id}`} className="table-link">
                      {route.crag_name}
                    </Link>
                  </td>
                  <td className="route-type">{route.sector_name}</td>
                  <td className="route-type">{route.region || "—"}</td>
                  <td className="route-type">{route.climbing_type || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {status === "ready" && sorted.length === 0 && (
          <p className="status-message">No routes match your filters.</p>
        )}
      </main>
    </>
  );
}

export default AllRoutes;
