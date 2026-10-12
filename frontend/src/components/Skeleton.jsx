/*
  Skeleton — a pulsing gray rectangle that mimics content while loading.

  How to use:
    <Skeleton width="200px" height="20px" />    — a text line
    <Skeleton width="100%" height="120px" />    — a card placeholder

  The "pulse" animation makes it gently brighten and dim,
  signaling to the user that content is loading (not broken).
*/
function Skeleton({ width = "100%", height = "16px", borderRadius = "4px" }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius }}
    />
  );
}

/*
  CardSkeleton — mimics the shape of a crag card while loading.
  Shows a rectangle with two small lines inside.
*/
function CardSkeleton() {
  return (
    <div className="skeleton-card">
      <Skeleton width="70%" height="20px" />
      <Skeleton width="40%" height="14px" />
    </div>
  );
}

/*
  GridSkeleton — shows multiple card skeletons in a grid.
  count = how many placeholder cards to show.
*/
function GridSkeleton({ count = 6 }) {
  return (
    <div className="crag-grid">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export { Skeleton, CardSkeleton, GridSkeleton };
