import { Link } from "react-router-dom";

/*
  404 page — shows when no route matches the URL.
  Simple, friendly, with a link back to the home page.
*/
function NotFound() {
  return (
    <div style={{ textAlign: "center", paddingTop: "60px" }}>
      <h1 style={{ fontSize: "72px", margin: "0", color: "var(--rust)" }}>404</h1>
      <p style={{ fontSize: "18px", color: "var(--tan)", margin: "12px 0 24px" }}>
        This page doesn't exist, maybe the route changed?
      </p>
      <Link to="/" className="submit-button" style={{ textDecoration: "none" }}>
        Back to crags
      </Link>
    </div>
  );
}

export default NotFound;
