import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import logoUrl from '../../assets/brand/jt-express-logo.png';
import mascotUrl from '../../assets/brand/jt-rabbit.webp';
import { LoginError, requestLoginCode, verifyLoginCode } from '../services/adminAuth';
import { A } from '../strings';
import { Icon } from './Icon';
import { OtpInput } from './OtpInput';
import './LoginPage.css';

const LAST_EMAIL_KEY = 'jt-admin-email';
const RESEND_SECONDS = 60;

const readLastEmail = () => {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
};

const errorText = (error: unknown) =>
  A.loginErrors[error instanceof LoginError ? error.code : 'server-error'] ?? A.loginErrors['server-error'];

export function LoginPage() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(readLastEmail);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const emailId = useId();
  const codeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'code') codeRef.current?.querySelector('input')?.focus();
  }, [step]);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestLoginCode(email.trim());
      try {
        localStorage.setItem(LAST_EMAIL_KEY, email.trim());
      } catch {
        /* storage unavailable: fine */
      }
      setStep('code');
      setCode('');
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      if (e instanceof LoginError && e.code === 'too-soon') {
        setStep('code');
        setCooldown(e.retryAfterSeconds ?? RESEND_SECONDS);
      } else setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (value = code) => {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await verifyLoginCode(email.trim(), value);
      // AdminApp switches to the dashboard when the session changes.
    } catch (e) {
      setError(errorText(e));
      setCode('');
      codeRef.current?.querySelector('input')?.focus();
      setBusy(false);
    }
  };

  const onEmailSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim()) void sendCode();
  };

  return (
    <div className="login">
      <div className="login__glow login__glow--a" aria-hidden="true" />
      <div className="login__glow login__glow--b" aria-hidden="true" />

      <main className="login__card">
        <img className="login__mascot" src={mascotUrl} alt="" aria-hidden="true" width={156} height={216} />
        <img className="login__logo" src={logoUrl} alt="J&T Express" width={359} height={81} />
        <span className="login__badge">{A.dashboard}</span>

        {step === 'email' ? (
          <form className="login__form" onSubmit={onEmailSubmit} noValidate>
            <div>
              <h1 className="login__title">{A.loginTitle}</h1>
              <p className="login__subtitle">{A.loginSubtitle}</p>
            </div>
            <div className="adm-field">
              <label htmlFor={emailId} className="adm-label">
                {A.email}
              </label>
              <div className="login__email">
                <Icon name="mail" />
                <input
                  id={emailId}
                  className="adm-input"
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  placeholder={A.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>
            {error && (
              <p className="adm-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="adm-btn adm-btn--primary adm-btn--block" disabled={busy || !email.trim()}>
              {busy ? <span className="adm-spinner" /> : <Icon name="arrow" />}
              {busy ? A.sending : A.sendCode}
            </button>
          </form>
        ) : (
          <form
            className="login__form"
            onSubmit={(e) => {
              e.preventDefault();
              void submitCode();
            }}
          >
            <div>
              <h1 className="login__title">{A.codeTitle}</h1>
              <p className="login__subtitle">
                {A.codeSentTo}
                <br />
                <bdi className="login__email-sent">{email.trim()}</bdi>
              </p>
            </div>
            <div ref={codeRef}>
              <OtpInput
                value={code}
                onChange={(v) => {
                  setCode(v);
                  if (error) setError(null);
                }}
                onComplete={(v) => void submitCode(v)}
                disabled={busy}
                invalid={!!error}
                label={A.codeLabel}
              />
            </div>
            {error && (
              <p className="adm-error login__center" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="adm-btn adm-btn--primary adm-btn--block" disabled={busy || code.length !== 6}>
              {busy && <span className="adm-spinner" />}
              {busy ? A.verifying : A.verify}
            </button>
            <p className="adm-hint login__center">{A.codeHint}</p>
            <div className="login__links">
              <button
                type="button"
                className="login__link"
                onClick={() => {
                  setStep('email');
                  setError(null);
                }}
              >
                {A.changeEmail}
              </button>
              <button type="button" className="login__link" disabled={cooldown > 0 || busy} onClick={() => void sendCode()}>
                {cooldown > 0 ? A.resendIn(cooldown) : A.resend}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
