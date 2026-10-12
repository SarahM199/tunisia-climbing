import { Link } from "react-router-dom";

/*
  AboutClimbing — short teaser for the home page.
  The full guide lives at /about; this just gives newcomers a reason to click
  without pushing the crag list down the page.
*/
function AboutClimbing({ stats }) {
  return (
    <section className="about">
      <h2 className="about-title">New to climbing in Tunisia?</h2>

      <div className="about-grid">
        <div className="about-col">
          <p>
            Sport climbing here is barely a decade old. The first routes went up
            around Djebel Zaghouan in 2012, and a Petzl team pushed the grades into
            the 8th grade in 2015. Today it's two limestone areas within an hour of
            Tunis, developed almost entirely by volunteers.
          </p>
        </div>
        <div className="about-col">
          <p>
            The season runs autumn through spring — summer heat makes most sectors
            genuinely unsafe. Shade timing matters more than almost anything else,
            which is what the recommender is built around.
          </p>
          <Link to="/about" className="cta-link">
            Read the full guide →
          </Link>
        </div>
      </div>

      {stats && (
        <p className="about-stat-line">
          {stats.routes} routes across {stats.sectors} sectors and {stats.crags}{" "}
          crags — and plenty of rock still untouched.
        </p>
      )}
    </section>
  );
}

export default AboutClimbing;
