/*
  RatingStars — compact read-only star display for lists and cards.

  Renders nothing when there's no rating yet, which keeps unrated sectors
  looking clean rather than showing five empty stars everywhere.

  Distinct from the interactive Stars inside SectorComments, which handles
  clicking to set your own rating.
*/
function RatingStars({ value, count, showValue = true }) {
  if (value == null) return null;

  const rounded = Math.round(value);
  const label = count
    ? `${value} out of 5, from ${count} ${count === 1 ? "climber" : "climbers"}`
    : `${value} out of 5`;

  return (
    <span className="stars stars--readonly rating-inline" title={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rounded ? "star star--on" : "star"}>
          ★
        </span>
      ))}
      {showValue && <span className="rating-inline-value">{value}</span>}
      {count ? <span className="rating-inline-count">({count})</span> : null}
    </span>
  );
}

export default RatingStars;
