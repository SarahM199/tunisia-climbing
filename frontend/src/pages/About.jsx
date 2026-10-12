import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

/*
  Route style keys come from the database as snake_case. This maps them to
  readable labels; anything unmapped falls back to the key with underscores
  swapped for spaces, so a new style won't break the page.
*/
const TYPE_LABELS = {
  sport: "sport",
  multi_pitch: "multi-pitch",
  top_rope: "top-rope",
  alpine: "alpine-style",
  bouldering: "bouldering",
  trad: "trad",
};

function typeLabel(key) {
  return TYPE_LABELS[key] || key.replace(/_/g, " ");
}

/*
  About — the full guide to climbing in Tunisia.

  Written for two audiences: visiting climbers who've never been, and
  Tunisians new to the sport. Figures come from this database; history and
  community details from the sources listed at the bottom.
*/
function About() {
  const [stats, setStats] = useState(null);

  // Non-critical: if this fails the page still reads fine, just without figures
  useEffect(() => {
    apiFetch("/stats")
      .then(setStats)
      .catch(() => {});
  }, []);

  return (

    <>
      <header className="site-header">
        <span className="eyebrow">Guide</span>
        <h1>Climbing in Tunisia</h1>
        <p className="tagline">
          A young scene on grey limestone, an hour from Tunis — what it is, when
          to come, and who built it.
        </p>
      </header>

      <main className="guide">
        {/* ---------- HISTORY ---------- */}
        <section className="guide-section">
          <h2 className="guide-heading">How it started</h2>
          <p>
            Sport climbing in Tunisia is barely more than a decade old. The first
            bolted routes went up around Djebel Zaghouan in 2012, when a team
            working alongside the local caving club, Petzl, and France's CNDS
            equipped roughly twenty-five single-pitch lines from 4a to 8a plus
            four multi-pitch routes. That same season saw the founding of the
            country's first climbing club, based in Zaghouan.
          </p>
          <p>
            Development accelerated after 2011, as the country opened up to the
            sport. A Petzl team returned to Zaghouan in 2015 and bolted the cave
            sector now known as Grotte Petzl, pushing difficulty into the 8th
            grade. Around the same period a group of climbers from Marseille
            opened further sectors on the massif. Zaghouan is now the country's
            main destination, with routes equipped by both Tunisian and European
            hands.
          </p>

          <div className="timeline">
            <div className="timeline-item">
              <span className="timeline-year">2012</span>
              <span className="timeline-text">
                First sport routes bolted at Zaghouan. Tunisia's first climbing
                club founded. Alexis Cacciardi equips Temple des Eaux in May.
              </span>
            </div>
            <div className="timeline-item">
              <span className="timeline-year">2013</span>
              <span className="timeline-text">
                ASME Radès founded in March, with a remit covering mountain sports
                and environmental conservation.
              </span>
            </div>
            <div className="timeline-item">
              <span className="timeline-year">2015</span>
              <span className="timeline-text">
                Petzl team develops Grotte Petzl and re-equips La Conque. A
                Marseille crew opens new sectors in April.
              </span>
            </div>
            <div className="timeline-item">
              <span className="timeline-year">Today</span>
              <span className="timeline-text">
                {stats
                  ? `${stats.crags} main areas, ${stats.sectors} sectors, ${stats.routes} catalogued routes — and a lot of unclimbed rock.`
                  : "A growing, community-maintained record of Tunisian climbing."}
              </span>
            </div>

          </div>
        </section>

        {/* ---------- THE FILM ---------- */}
        <section className="guide-section">
          <h2 className="guide-heading">Watch this first</h2>
          <p>
            If you want to understand the scene rather than just the rock, start
            with{" "}
            <a
              href="https://lafabriqueverticale.com/fr/tchaabita-une-histoire-descalade-en-tunisie/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <em>Tchaabita, une histoire d'escalade en Tunisie</em>
            </a>{" "}
            — a 16-minute documentary by Cécile Jeanmougin and Antoine Tissier,
            made after the pair spent five years living in Tunis. It traces how
            climbing emerged here and introduces the local climbers driving it
            forward. The directors describe it as a tribute to the Tunisian
            climbing community, and it makes clear that for many of the people in
            it, climbing became considerably more than a sport.
          </p>
        </section>

        {/* ---------- WHERE ---------- */}
        <section className="guide-section">
          <h2 className="guide-heading">Where to climb</h2>

          <div className="guide-cards">
            <div className="guide-card">
              <h3>Djebel Zaghouan</h3>
              <p className="guide-card-meta">Zaghouan governorate · limestone</p>
              <p>
                The country's premier area and where the sport began. A
                nine-kilometre massif in the north-east of the Tunisian Dorsale,
                holding everything from beginner slabs to steep,
                concretion-covered caves. Sport, multi-pitch, a few alpine-style
                lines, and some bouldering. The hardest routes reach into the 8th
                grade.
              </p>
              <Link to="/crags/2" className="cta-link">
                Browse Zaghouan sectors →
              </Link>
            </div>

            <div className="guide-card">
              <h3>Djebel Ressas</h3>
              <p className="guide-card-meta">Ben Arous governorate · limestone</p>
              <p>
                Around thirty minutes from central Tunis, which makes it the
                natural after-work crag. Shorter walls suiting all levels, plus
                bouldering and a good deal of undeveloped potential. Several
                sectors face north or north-east and stay shaded for most of the
                day — which matters more here than almost anything else.
              </p>
              <Link to="/crags/1" className="cta-link">
                Browse Ressas sectors →
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- WHEN ---------- */}
        <section className="guide-section">
          <h2 className="guide-heading">When to come</h2>
          <p>
            <strong>Autumn through spring.</strong> October to April is the season.
            Spring and autumn give the most reliable conditions; winter climbs well
            on sunny aspects but brings rain.
          </p>
          <div className="guide-callout guide-callout--warning">
            <p>
              <strong>Do not plan a summer trip.</strong> Rock temperatures in July
              and August regularly make climbing unsafe rather than merely
              unpleasant — this site's own forecast rates most sectors unclimbable
              above 40&nbsp;°C even in full shade. If you are here in summer, climb
              at dawn on a north-facing sector, or don't climb.
            </p>
          </div>
          <p>
            Aspect matters year-round. Many sectors in this database record when
            they fall into shade, and the{" "}
            <Link to="/recommend">recommender</Link> uses that alongside the
            forecast to rank sectors for a specific date and time. It's the single
            most useful tool here if you're planning a day.
          </p>
        </section>

        {/* ---------- ROCK AND STYLE ---------- */}
        <section className="guide-section">
          <h2 className="guide-heading">The rock and the style</h2>
          <p>
            Grey limestone throughout — Hauterivian in places, sculpted, and at
            Zaghouan streaked with tufa and concretions in the caves. Expect
            technical face climbing on the slabs and steep, three-dimensional
            movement in the caves.
          </p>

          {/* Counts read live from the database, so this stays accurate
              as routes are added */}
          {stats?.route_types && (
            <>
              <p>Of the {stats.routes} routes catalogued here:</p>
              <ul className="guide-list">
                {Object.entries(stats.route_types)
                  .sort((a, b) => b[1] - a[1])
                  .map(([style, count]) => (
                    <li key={style}>
                      <strong>
                        {count} {typeLabel(style)}
                      </strong>
                    </li>
                  ))}
              </ul>
            </>
          )}

          {stats?.grade_min && stats?.grade_max && (
            <p>
              Grades run from {stats.grade_min} to {stats.grade_max}, so there's
              genuine range, though the middle grades are best represented.
            </p>
          )}
        </section>


        {/* ---------- GEAR ---------- */}
        <section className="guide-section">
          <h2 className="guide-heading">What to bring</h2>
          <ul className="guide-list">
            <li>
              <strong>A 70 m rope</strong> covers most single-pitch routes here.
              Some lines are longer, and multi-pitch routes need considerably more
              — check the individual route entries.
            </li>
            <li>
              <strong>
                Up to {stats?.max_quickdraws ?? 15} quickdraws
              </strong>{" "}
              for the longest pitches here. Most routes need far fewer, but a few
              want the full rack.
            </li>

            <li>
              <strong>Nuts and cams</strong> if you're heading for the alpine and
              grande voie lines on Kàf al Blida — those are only partially equipped
              and explicitly need trad gear.
            </li>
            <li>
              <strong>Far more water than you think.</strong> Approaches run from{" "}
              {stats?.approach_min_minutes ?? 5} to{" "}
              {stats?.approach_max_minutes ?? 60} minutes, with no shade and no
              water on the walk in.
            </li>

            <li>
              <strong>A helmet</strong> for the multi-pitch and alpine routes.
            </li>
          </ul>
        </section>

        {/* ---------- CLUBS AND GYMS ---------- */}
        <section className="guide-section">
          <h2 className="guide-heading">Clubs and gyms</h2>
          <p>
            If you're visiting, this is the section that matters most. Tunisia has
            no commercial guiding scene to fall back on, so finding the community
            is how you find partners, current access information, and a lift to the
            crag.
          </p>

          <div className="guide-cards">
            <div className="guide-card">
              <h3>Climb'IN</h3>
              <p className="guide-card-meta">Bouldering gym · La Soukra, Tunis</p>
              <p>
                The first space in Tunisia dedicated entirely to climbing, and part
                of a broader effort to develop mountain sports in the country. It
                specialises in bouldering, and its stated purpose is to introduce
                Tunisian climbers — women and men alike — to the discipline and
                open mountain sports up to a much wider audience.
              </p>
              <p>
                Practically speaking, it's the main indoor meeting point for the
                scene. Worth a session before you head out to the rock.
              </p>
              <a
                href="https://www.instagram.com/climb.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="cta-link"
              >
                Climb'IN on Instagram →
              </a>
            </div>

            <div className="guide-card">
              <h3>ASME Radès</h3>
              <p className="guide-card-meta">
                Sports association · Radès · founded March 2013
              </p>
              <p>
                A mountain sports association founded on 6 March 2013, less than a
                year after the first sport routes went up at Zaghouan. Its stated
                aims are to help spread mountain sports in Tunisia and to promote
                solidarity, the spirit of adventure sports, and conservation of the
                environment.
              </p>
              <p>
                Clubs like this are where outdoor trips get organised, and where
                you'll get an honest answer about whether a sector is currently
                accessible and what the fixed gear is like.
              </p>
              <a
                href="https://www.facebook.com/ASMERades/"
                target="_blank"
                rel="noopener noreferrer"
                className="cta-link"
              >
                ASME Radès on Facebook →
              </a>
            </div>
          </div>

          <div className="guide-callout">
            <p>
              <strong>Coming from abroad?</strong> Message one of these before you
              book flights. Access details, road conditions and bolt quality change
              in ways no website keeps up with, and a local partner is worth more
              than any topo — including this one.
            </p>
          </div>
        </section>

                {/* ---------- BEFORE YOU GO ---------- */}
        <section className="guide-section">
          <h2 className="guide-heading">A few things to know before you go</h2>
          <p>
            The routes here were put up by volunteers. Climbers bought the bolts
            with their own money and spent their weekends drilling — there's no
            funding behind any of it, and nobody is paid to maintain it. Among them:
            Alexis Cacciardi at Temple des Eaux, Michael Pfau, Jan Bakker and Mourad
            Attia on Kàf al Blida, the visiting Petzl teams, and the Tunisian
            climbers who keep things going in between.
          </p>
          <p>Which means:</p>
          <ul className="guide-list">
            <li>
              <strong>Check the bolts yourself.</strong> Some date back to 2012, and
              sea air wears metal down. If one looks rusty or loose, don't trust it.
            </li>
            <li>
              <strong>Report problems instead of fixing them.</strong> If a route
              needs new bolts, tell a local club. Replacing someone else's gear
              yourself isn't welcome.
            </li>
            <li>
              <strong>Most approaches cross farmland.</strong> People work and graze
              animals there. Close gates behind you, take all your rubbish home, and
              say hello to the shepherds.
            </li>
            <li>
              <strong>Djebel Zaghouan is a national park.</strong> Leave no trace.
            </li>
          </ul>
        </section>


        {/* ---------- CONTRIBUTE ---------- */}
        <section className="guide-section">
          <h2 className="guide-heading">Help improve this</h2>
          <p>
            Every crag record here came from guidebook notes and climbers' own
            observations, which means some of it is incomplete and some of it is
            probably wrong. Shade timings are estimated from wall orientation
            wherever nobody has measured the real thing.
          </p>
          <p>
            If you climb here, <Link to="/register">make an account</Link> and add
            what you know — a rating, a correction, a photo of the approach, the
            actual hour a sector goes into shade. Sector pages take comments and
            photos, and grades in particular benefit from more than one opinion.
          </p>
        </section>

        {/* ---------- SOURCES ---------- */}
        <section className="guide-section guide-section--sources">
          <h2 className="guide-heading">Sources</h2>
          <p className="about-sources">
            History and area information summarised and rephrased from{" "}
            <a
              href="https://www.ukclimbing.com/forums/ukc/tunisias_first_sport_climbing_is_born-515219"
              target="_blank"
              rel="noopener noreferrer"
            >
              UKClimbing
            </a>
            ,{" "}
            <a
              href="https://www.mountainproject.com/area/120259267/tunisia"
              target="_blank"
              rel="noopener noreferrer"
            >
              Mountain Project
            </a>
            ,{" "}
            <a
              href="https://lafabriqueverticale.com/fr/tchaabita-une-histoire-descalade-en-tunisie/"
              target="_blank"
              rel="noopener noreferrer"
            >
              La Fabrique Verticale
            </a>
            ,{" "}
            <a
              href="https://fr.wikipedia.org/wiki/Djebel_Zaghouan"
              target="_blank"
              rel="noopener noreferrer"
            >
              Wikipedia
            </a>
            ,{" "}
            <a
              href="https://www.instagram.com/climb.in/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Climb'IN
            </a>
            ,{" "}
            <a
              href="https://www.facebook.com/ASMERades/"
              target="_blank"
              rel="noopener noreferrer"
            >
              ASME Radès
            </a>
            , and the local guidebook notes recorded in this database. Route counts
            and gear figures are drawn from the database itself.
          </p>
          <p className="about-sources">
            Conditions, access and fixed hardware change. Nothing here replaces
            local knowledge or your own judgement on the day.
          </p>
        </section>
      </main>
    </>
  );
}

export default About;
