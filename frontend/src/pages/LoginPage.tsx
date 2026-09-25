import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import logo from "../assets/nova-logo.png";
import "./LoginPage.css";

type Item = { kind: 'quote'; text: string; by: string } | { kind: 'riddle'; text: string; answer: string };

const ITEMS: Item[] = [
  { kind: 'quote', text: 'The secret of getting ahead is getting started.', by: 'Mark Twain' },
  { kind: 'riddle', text: 'I am the one place every SAP transaction starts from, yet I have no data of my own. What am I?', answer: 'The SAP Easy Access menu' },
  { kind: 'quote', text: 'Quality is not an act, it is a habit.', by: 'Aristotle' },
  { kind: 'riddle', text: 'I am a 3-letter code that takes you to the contents of any table, and every consultant has used me. What am I?', answer: 'SE16' },
  { kind: 'quote', text: 'Well done is better than well said.', by: 'Benjamin Franklin' },
  { kind: 'riddle', text: 'I keep each client’s data apart from every other client on the same system. What am I?', answer: 'The client (MANDT) field' },
  { kind: 'quote', text: 'Small steps every day lead to big results.', by: 'Unknown' },
  { kind: 'riddle', text: 'I am the layer that keeps SAP running: kernel, database and instances, but I never touch business data. Who looks after me?', answer: 'SAP Basis' },
  { kind: 'quote', text: 'Whether you think you can or you think you cannot, you are right.', by: 'Henry Ford' },
  { kind: 'riddle', text: 'I carry your changes from development to quality to production, one safe box at a time. What am I?', answer: 'A transport request' },
];

const FACTS = [
  'SAP was founded in 1972 by five former IBM engineers in Germany.',
  'SAP stands for Systems, Applications and Products in Data Processing.',
  'SAP S/4HANA runs on an in-memory database, so reports that took hours can run in seconds.',
  'Fiori is SAP’s modern, role-based user experience for web and mobile.',
  'A single SAP client can hold finance, sales, HR and logistics data for a whole company.',
  'SAP BTP lets teams extend core systems without modifying the standard code.',
  'Transaction codes, or T-codes, are shortcuts that jump straight to a SAP screen.',
  'ABAP, SAP’s own programming language, has been in use since the 1980s.',
  'Clean core means keeping custom code out of the standard system for easier upgrades.',
  'SAP Basis administrators keep servers, databases and transports healthy behind the scenes.',
];

const ROTATE_MS = 15000;
const REVEAL_MS = 7000;

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [index, setIndex] = useState(() => Math.floor(Math.random() * ITEMS.length));
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setIndex((i) => (i + 1) % ITEMS.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setRevealed(false);
    const id = window.setTimeout(() => setRevealed(true), REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [index]);

  const item = ITEMS[index];
  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const from = (location.state as { from?: string } | null)?.from ?? "/";
  if (user) return <Navigate to={from} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login">
      <section className="login__hero" aria-hidden="true">
        <div className="login__hero-glow" />
        <div className="login__hero-content">
          <div className="login__hero-top">
            <div>
              <p className="login__hero-company">ImpleVista IT India Pvt Ltd</p>
              <p className="login__hero-date">{greeting} · {dateLabel}</p>
            </div>
          </div>

          <div className="login__hero-main">
            <span className="login__hero-quote-mark">“</span>
            <span className="login__hero-badge">{item.kind === 'quote' ? 'Quote of the moment' : 'SAP riddle'}</span>
            <div className="login__hero-item" key={index}>
              <p className="login__hero-text">{item.kind === 'quote' ? item.text : item.text}</p>
              {item.kind === 'quote' ? (
                <p className="login__hero-by">— {item.by}</p>
              ) : (
                <p className={'login__hero-answer' + (revealed ? ' login__hero-answer--on' : '')}>Answer: {item.answer}</p>
              )}
            </div>
            <div className="login__hero-progress"><span key={index} /></div>
          </div>

          <div className="login__hero-fact">
            <span className="login__hero-fact-label">Did you know?</span>
            <p key={index}>{FACTS[index]}</p>
          </div>

          <div className="login__hero-dots">
            {ITEMS.map((_, i) => (
              <span key={i} className={i === index ? 'login__hero-dot login__hero-dot--on' : 'login__hero-dot'} />
            ))}
          </div>
        </div>
      </section>

      <section className="login__panel">
        <form className="login__card" onSubmit={handleSubmit}>
          <img src={logo} alt="ImpleVista IT India Pvt Ltd" className="login__logo" />
          <h1 className="login__title">Sign in</h1>

          <label className="login__field">
            <span>Work email</span>
            <div className="login__input">
              <Mail size={16} strokeWidth={1.8} aria-hidden="true" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="you@implevistait.com"
                required
              />
            </div>
          </label>

          <label className="login__field">
            <span>Password</span>
            <div className="login__input">
              <Lock size={16} strokeWidth={1.8} aria-hidden="true" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="login__toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
              </button>
            </div>
          </label>

          {error && (
            <p className="login__error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="login__submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
            {!submitting && <ArrowRight size={16} strokeWidth={2} />}
          </button>
        </form>
      </section>
    </main>
  );
}
