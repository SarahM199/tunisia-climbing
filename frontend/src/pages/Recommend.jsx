import { useState } from "react";
import { Link } from "react-router-dom";
import RatingStars from "../components/RatingStars";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/*
  GRADE_OPTIONS — All French sport grades for the dropdown.
  Using a dropdown prevents typos like "6A" or "6 a" that break the API.
*/
const GRADE_OPTIONS = [
  "4a", "4b", "4c",
  "5a", "5a+", "5b", "5b+", "5c", "5c+",
  "6a", "6a+", "6b", "6b+", "6c", "6c+",
  "7a", "7a+", "7b", "7b+", "7c", "7c+",
  "8a", "8a+", "8b", "8b+", "8c", "8c+",
];

function scoreClass(label) {
  if (label === "Excellent") return "score-excellent";
  if (label === "Good") return "score-good";
  if (label === "Marginal") return "score-marginal";
  return "score-poor";
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

/*
  ConditionBadge — a colored pill showing conditions quality.
  Think of it like a weather app label: green "Excellent", red "Poor".
*/
function ConditionBadge({ label }) {
  return (
    <span className={`condition-badge ${scoreClass(label)}`}>
      {label}
    </span>
  );
}
 

/*
  ResultCard — each recommendation result.
  Shows rank, sector info, weather reasons, and score.
*/
function ResultCard({ result, rank }) {
  const gradeLabel =
    result.grade_min && result.grade_max && result.grade_min !== result.grade_max
      ? `${result.grade_min} – ${result.grade_max}`
      : result.grade_min || result.grade_max;

  return (
    <Link to={`/sectors/${result.sector_id}`} className={`result-card ${scoreClass(result.label)}`}>
      <div className="result-rank">#{rank}</div>
      <div className="result-main">
        <h3>{result.sector_name}</h3>
        <p className="result-crag">{result.crag_name}</p>

        <div className="result-tags">
          {gradeLabel && <span className="grade-badge">{gradeLabel}</span>}
          {result.climbing_type && <span className="tag">{result.climbing_type}</span>}
          {result.shade_by_hour && (
            <span className="tag">
              ☀→☁ {result.shade_by_hour}:00
            </span>
          )}
          {!result.exact_date_match && (
            <span className="tag tag--warning">≈ {result.date_used}</span>
          )}
          <RatingStars value={result.rating} count={result.rating_count} />
        </div>

        {/* Reasons — show as short badges instead of bullet list */}
        <div className="result-reason-badges">
          {result.reasons.map((r, i) => (
            <span key={i} className="reason-badge">{r}</span>
          ))}
        </div>
      </div>

      <ConditionBadge  label={result.label} />
    </Link>
  );
}

function Recommend() {
  const [date, setDate] = useState(todayISO());
  const [grade, setGrade] = useState("6a");
  const [time, setTime] = useState("");
  const [climbingType, setClimbingType] = useState("");
  const [status, setStatus] = useState("idle");
  const [response, setResponse] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");

    const params = new URLSearchParams({ date, grade });
    if (time) params.set("time", time);
    if (climbingType) params.set("climbing_type", climbingType);

    fetch(`${API_URL}/recommend?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setResponse(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  return (
    <>
      <header className="site-header">
        <span className="eyebrow">Plan a session</span>
        <h1>Find your sector</h1>
        <p className="tagline">
          Tell us your project grade and when you're climbing — we'll rank sectors
          by warm-up availability, conditions, and shade timing.
        </p>
      </header>

      {/* FORM */}
      <form className="recommend-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Grade dropdown instead of text input */}
        <div className="form-field">
          <label htmlFor="grade">Project grade</label>
          <select
            id="grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            required
          >
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Time input */}
        <div className="form-field">
          <label htmlFor="time">Time (optional)</label>
          <input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        {/* Climbing type filter */}
        <div className="form-field">
          <label htmlFor="type">Style (optional)</label>
          <select
            id="type"
            value={climbingType}
            onChange={(e) => setClimbingType(e.target.value)}
          >
            <option value="">Any style</option>
            <option value="sport">Sport</option>
            <option value="multi_pitch">Multi-pitch</option>
            <option value="bouldering">Bouldering</option>
            <option value="top_rope">Top rope</option>
          </select>
        </div>

        <button type="submit" className="submit-button">
          {status === "loading" ? "Searching…" : "Find sectors"}
        </button>
      </form>

      <main>
        {/* IDLE STATE — before any search */}
        {status === "idle" && (
          <div className="recommend-empty">
            <p className="recommend-empty-icon">🧗</p>
            <p className="recommend-empty-text">
              Pick your grade and date above, and we'll find the best sector for your session.
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {status === "error" && (
          <p className="status-message error">
            Something went wrong — try again or check the backend is running.
          </p>
        )}

        {/* LOADING STATE */}
        {status === "loading" && (
          <div className="recommend-empty">
            <p className="recommend-empty-text">Checking weather and scoring sectors…</p>
          </div>
        )}

        {/* RESULTS */}
        {status === "ready" && response && (
          <>
            {/* Summary bar */}
            <div className="result-summary-bar">
              <span>
                <strong>{response.recommendations.length}</strong> sectors found
              </span>
              {response.warmup_steps_used != null && (
                <span>
                  Warm-up range: {response.warmup_steps_used} grade{response.warmup_steps_used > 1 ? "s" : ""} below {grade}
                </span>
              )}
              <span>
                Date: {response.date}
              </span>
            </div>

            {response.recommendations.length === 0 && (
              <div className="recommend-empty">
                <p className="recommend-empty-text">{response.message}</p>
              </div>
            )}

            <div className="result-list">
              {response.recommendations.map((result, i) => (
                <ResultCard key={result.sector_id} result={result} rank={i + 1} />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}

export default Recommend;
