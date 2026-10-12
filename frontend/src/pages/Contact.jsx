import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

/*
  Contact — a structured feedback form.

  The purpose dropdown means messages arrive pre-sorted rather than as a pile
  of untitled text. Sector pages link here with ?sector= and ?sectorName= so
  a correction arrives already attached to what it's about.
*/

const PURPOSES = [
  { value: "correction", label: "Correction to existing data" },
  { value: "new_sector", label: "A sector or route you're missing" },
  { value: "shade_timing", label: "Shade timing observation" },
  { value: "other", label: "Something else" },
];

function Contact() {
  const { user } = useAuth();
  const [params] = useSearchParams();

  // Set when arriving from a sector page's "suggest a correction" link
  const sectorId = params.get("sector");
  const sectorName = params.get("sectorName");

  const [purpose, setPurpose] = useState(
    params.get("purpose") || (sectorId ? "correction" : "other")
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");

  // Honeypot. Hidden via CSS — if this comes back filled in, the backend
  // treats the submission as a bot and silently discards it.
  const [website, setWebsite] = useState("");

  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");

  // Prefill from the account when logged in
  useEffect(() => {
    if (user) {
      setName(user.display_name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setStatus("sending");

    try {
      const res = await apiFetch("/contact", {
        method: "POST",
        body: JSON.stringify({
          purpose,
          body,
          name: name || null,
          email: email || null,
          sector_id: sectorId ? Number(sectorId) : null,
          sector_name: sectorName || null,
          website: website || null,
        }),
      });
      setConfirmation(res.message);
      setStatus("sent");
      setBody("");
    } catch (err) {
      // Covers the 429 daily limit as well as validation errors
      setError(err.message);
      setStatus("error");
    }
  }

  // Success screen replaces the form entirely
  if (status === "sent") {
    return (
      <>
        <header className="site-header">
          <span className="eyebrow">Contact</span>
          <h1>Message sent</h1>
        </header>
        <div className="guide-callout">
          <p>{confirmation}</p>
        </div>
        <p style={{ marginTop: "20px" }}>
          <Link to="/" className="cta-link">
            Back to crags →
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <header className="site-header">
        <span className="eyebrow">Contact</span>
        <h1>Get in touch</h1>
        <p className="tagline">
          Found a mistake, know a sector we're missing, or measured when a wall
          actually goes into shade? This database is only as good as what
          climbers tell us.
        </p>
      </header>

      {/* Shown only when arriving from a sector page */}
      {sectorName && (
        <div className="guide-callout">
          <p>
            You're sending feedback about <strong>{sectorName}</strong>. It'll be
            attached to your message automatically.
          </p>
        </div>
      )}

      <form className="auth-form contact-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="purpose">What's this about?</label>
          <select
            id="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            required
          >
            {PURPOSES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="contact-body">Your message</label>
          <textarea
            id="contact-body"
            rows={7}
            placeholder="Be as specific as you can — sector name, route name, and what's wrong or missing."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            minLength={10}
            maxLength={4000}
          />
          <span className="field-hint">{body.length} / 4000</span>
        </div>

        {/* Only asked when not logged in — otherwise we use the account details */}
        {!user && (
          <>
            <div className="form-field">
              <label htmlFor="contact-name">Your name (optional)</label>
              <input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>

            <div className="form-field">
              <label htmlFor="contact-email">Email (optional)</label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <span className="field-hint">
                Only so we can reply or ask a follow-up question.
              </span>
            </div>
          </>
        )}

        {user && (
          <p className="field-hint">
            Sending as <strong>{user.display_name}</strong>.
          </p>
        )}

        {/*
          HONEYPOT — hidden by CSS, not type="hidden", because some bots skip
          hidden inputs. aria-hidden and tabIndex keep it away from screen
          readers and keyboard navigation.

          IMPORTANT: this needs the .honeypot CSS rule to be invisible. Without
          it, real users see a "Website" box, fill it in, and their genuine
          messages get thrown away.
        */}
        <div className="honeypot" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        {error && <p className="status-message error">{error}</p>}

        <button
          type="submit"
          className="submit-button"
          disabled={status === "sending"}
        >
          {status === "sending" ? "Sending…" : "Send message"}
        </button>

        <p className="auth-switch">
          For partners, trips or local knowledge, the clubs are a better bet —
          see <Link to="/about">the guide</Link>.
        </p>
      </form>
    </>
  );
}

export default Contact;
