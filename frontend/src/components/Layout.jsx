import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Footer from "./Footer";
import BrandIcon from "./ClimberIcon";
import { useAuth } from "../context/AuthContext";

function Layout({ children }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  function handleNavClick() {
    setMenuOpen(false);
  }

  function handleLogout() {
    logout();
    setMenuOpen(false);
  }

  return (
    <>
      <nav className="top-nav">
        <div className="top-nav-inner">
          <Link to="/" className="nav-brand" onClick={handleNavClick}>
            <BrandIcon size={22} color="var(--rust)" />
            <span>Tunisia Climbing</span>
          </Link>

          <button
            className="hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            type="button"
          >
            <span className={`hamburger-line ${menuOpen ? "open" : ""}`} />
            <span className={`hamburger-line ${menuOpen ? "open" : ""}`} />
            <span className={`hamburger-line ${menuOpen ? "open" : ""}`} />
          </button>

          <div className={`nav-links ${menuOpen ? "nav-links--open" : ""}`}>
            <Link
              to="/"
              className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
              onClick={handleNavClick}
            >
              Crags
            </Link>
            <Link
              to="/routes"
              className={`nav-link ${location.pathname === "/routes" ? "active" : ""}`}
              onClick={handleNavClick}
            >
              Routes
            </Link>
            <Link
              to="/map"
              className={`nav-link ${location.pathname === "/map" ? "active" : ""}`}
              onClick={handleNavClick}
            >
              Map
            </Link>
            <Link
              to="/recommend"
              className={`nav-link ${location.pathname === "/recommend" ? "active" : ""}`}
              onClick={handleNavClick}
            >
              Recommend
            </Link>

            <Link
              to="/about"
              className={`nav-link ${location.pathname === "/about" ? "active" : ""}`}
              onClick={handleNavClick}
            >
              Guide
            </Link>


            {/* Auth area — changes depending on whether you're logged in */}
            {user ? (
              <>
                <span className="nav-user">{user.display_name}</span>
                <button type="button" className="nav-link nav-logout" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className={`nav-link ${location.pathname === "/login" ? "active" : ""}`}
                onClick={handleNavClick}
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="page">{children}</div>

      <Footer />
    </>
  );
}

export default Layout;
