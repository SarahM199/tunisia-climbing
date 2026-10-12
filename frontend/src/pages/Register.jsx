import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Register() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Check here too so the user gets instant feedback.
    // The backend enforces this as well — never trust the frontend alone.
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await register(email, displayName, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="site-header">
        <span className="eyebrow">Join</span>
        <h1>Create an account</h1>
        <p className="tagline">
          Rate sectors, leave beta, and help build the Tunisian climbing database.
        </p>
      </header>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="reg-name">Display name</label>
          <input
            id="reg-name"
            type="text"
            placeholder="How other climbers will see you"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            minLength={2}
            maxLength={50}
          />
        </div>

        <div className="form-field">
          <label htmlFor="reg-email">Email</label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <span className="field-hint">At least 8 characters</span>
        </div>

        {error && <p className="status-message error">{error}</p>}

        <button type="submit" className="submit-button" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </button>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </>
  );
}

export default Register;
