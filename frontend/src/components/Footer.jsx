import { Link } from "react-router-dom";

/*
  Footer — minimal, but carries the community links since those are the most
  useful outbound links on the site for a visiting climber.
*/
function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p className="footer-brand">Tunisia Climbing</p>

        {/* All links live inside this one paragraph so they sit on a single
            line and pick up the .footer-links styling */}
        <p className="footer-links">
          <Link to="/about">Guide</Link>
          <span className="footer-sep">·</span>
          <Link to="/contact">Contact</Link>
          <span className="footer-sep">·</span>
          <a
            href="https://www.instagram.com/climb.in/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Climb'IN
          </a>
          <span className="footer-sep">·</span>
          <a
            href="https://www.facebook.com/ASMERades/"
            target="_blank"
            rel="noopener noreferrer"
          >
            ASME Radès
          </a>
        </p>

        <p className="footer-note">
          Route data from local guidebooks and climbers · Weather by Open-Meteo
        </p>
      </div>
    </footer>
  );
}

export default Footer;
