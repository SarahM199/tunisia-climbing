import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email, password);
      navigate("/"); // send them home after logging in
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="site-header">
        <span className="eyebrow">Welcome back</span>
        <h1>Log in</h1>
        <p className="tagline">Log in to rate sectors and share beta with other climbers.</p>
      </header>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="status-message error">{error}</p>}

        <button type="submit" className="submit-button" disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </button>

        <p className="auth-switch">
          No account yet? <Link to="/register">Create one</Link>
        </p>
      </form>
    </>
  );
}

export default Login;
