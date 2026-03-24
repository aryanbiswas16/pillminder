import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Pill, User, Heart, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';

/* ────────────── HCI: Shared role card data (Gestalt – Similarity) ──────────── */
const ROLES = [
  {
    key: 'resident',
    label: 'I take medications',
    sublabel: 'Resident',
    icon: User,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    activeBg: 'bg-blue-100',
    activeBorder: 'border-blue-600',
    iconBg: 'bg-blue-600',
    iconColor: 'text-blue-600',
  },
  {
    key: 'caregiver',
    label: 'I care for someone',
    sublabel: 'Caregiver / Nurse',
    icon: Heart,
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    activeBg: 'bg-rose-100',
    activeBorder: 'border-rose-600',
    iconBg: 'bg-rose-600',
    iconColor: 'text-rose-600',
  },
];

/* ──────────── HCI: Progress bar (Zeigarnik Effect) ─────────────── */
const StepProgress = ({ current, total }) => {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="mb-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Step ${current} of ${total}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-gray-500">Step {current} of {total}</span>
        <span className="text-sm font-bold text-blue-600">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

/* ───────────────────────── Main Login ──────────────────────────── */
const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const TOTAL_STEPS = 2;

  const [step, setStep]               = useState(1);
  const [selectedRole, setSelectedRole] = useState('');
  const [email, setEmail]              = useState('');
  const [fieldError, setFieldError]    = useState('');
  const [loading, setLoading]          = useState(false);

  const emailRef = useRef(null);

  // HCI: Auto-focus the email field when user advances to step 2
  useEffect(() => {
    if (step === 2 && emailRef.current) {
      emailRef.current.focus();
    }
  }, [step]);

  const clearError = () => setFieldError('');

  /* ── Step validation (inline errors next to field — HCI Input Form rules) ── */
  const validateAndAdvance = () => {
    if (step === 1) {
      if (!selectedRole) {
        setFieldError('Please select one of the options above.');
        return;
      }
      clearError();
      setStep(2);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.includes('@') || email.length < 5) {
      setFieldError('Please enter a valid email address.');
      return;
    }
    clearError();
    setLoading(true);
    await login(email, '', selectedRole);
    setLoading(false);
  };

  const handleBack = () => { clearError(); setStep(1); };

  return (
    <div className="min-h-full flex flex-col bg-gradient-to-b from-blue-700 to-blue-500">

      {/* ── Brand header ── */}
      <header className="relative flex flex-col items-center justify-center pt-4 pb-2 px-6">
        {/* Back button — only on step 2 */}
        {step === 2 && (
          <button
            onClick={handleBack}
            aria-label="Go back"
            className="
              absolute left-4 top-3 w-11 h-11 flex items-center justify-center rounded-xl bg-white/20
              text-white hover:bg-white/30 transition-all
              focus:outline-none focus:ring-4 focus:ring-white/40
            "
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
        <div
          className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-1 shadow-lg"
          aria-hidden="true"
        >
          <Pill className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">PillMinder</h1>
        <p className="text-sm text-blue-100 font-medium">Your medication companion</p>
      </header>

      {/*
        ── White card ──
        flex-col: content div (flex-1) stays at top,
        actions div pins to the bottom — thumb zone.
      */}
      <main className="flex-1 flex flex-col bg-white rounded-t-3xl shadow-2xl px-5 pt-4 pb-4">

        {/* ·············· STEP 1 — Role ·············· */}
        {step === 1 && (
          <>
            {/* Content — occupies available space at top */}
            <div className="flex-1">
              <StepProgress current={1} total={TOTAL_STEPS} />

              <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Welcome back</h2>
              <p className="text-base text-gray-500 mb-2">First, tell us who you are.</p>

              {/* Hick's Law — only 2 options */}
              <fieldset>
                <legend className="sr-only">Select your role</legend>
                <div className="flex flex-col gap-2" role="radiogroup" aria-label="Who are you?">
                  {ROLES.map(({
                    key, label, sublabel, icon: Icon,
                    bg, border, activeBg, activeBorder, iconBg, iconColor,
                  }) => {
                    const active = selectedRole === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => { setSelectedRole(key); clearError(); }}
                        className={`
                          flex items-center gap-4 w-full px-4 py-3 rounded-2xl border-2 text-left
                          transition-all duration-200
                          focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-blue-400
                          ${active
                            ? `${activeBg} ${activeBorder} shadow-md ring-2 ring-blue-100`
                            : `${bg} ${border} hover:shadow-sm`}
                        `}
                        style={{ minHeight: '72px' }}
                      >
                        {/* Icon */}
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                            ${active ? iconBg : 'bg-white border-2 ' + border}`}
                          aria-hidden="true"
                        >
                          <Icon className={`w-6 h-6 ${active ? 'text-white' : iconColor}`} />
                        </div>
                        {/* Text */}
                        <div className="flex-1">
                          <p className="text-lg font-bold text-gray-900 leading-tight">{label}</p>
                          <p className={`text-sm font-medium mt-0.5 ${active ? 'text-gray-600' : 'text-gray-400'}`}>
                            {sublabel}
                          </p>
                        </div>
                        {/* Von Restorff — checkmark on selected state */}
                        {active && (
                          <div
                            className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}
                            aria-hidden="true"
                          >
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Inline error — adjacent to field, not a top banner */}
              {fieldError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="flex items-center gap-3 mt-3 p-3 bg-red-50 border-2 border-red-300 rounded-xl"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" aria-hidden="true" />
                  <p className="text-base font-semibold text-red-700">{fieldError}</p>
                </div>
              )}
            </div>

            {/* Actions — pinned to bottom (thumb zone, Fitts' Law) */}
            <div className="mt-3">
              <button
                type="button"
                onClick={validateAndAdvance}
                disabled={!selectedRole}
                className="
                  w-full flex items-center justify-center gap-3
                  bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                  disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed
                  text-white font-bold rounded-2xl shadow-lg shadow-blue-200
                  transition-all duration-200
                  focus:outline-none focus:ring-4 focus:ring-blue-300
                "
                style={{ fontSize: '1.125rem', minHeight: '64px' }}
              >
                Continue
                <ArrowRight className="w-6 h-6" aria-hidden="true" />
              </button>

              <p className="text-center text-base text-gray-500 mt-2">
                New here?{' '}
                <Link
                  to="/register"
                  className="font-bold text-blue-600 underline underline-offset-4
                    focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                >
                  Create your account
                </Link>
              </p>
            </div>
          </>
        )}

        {/* ·············· STEP 2 — Email ·············· */}
        {step === 2 && (
          <form onSubmit={handleSubmit} noValidate className="flex-1 flex flex-col">

            {/* Content — top */}
            <div className="flex-1">
              <StepProgress current={2} total={TOTAL_STEPS} />

              <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Your email</h2>
              <p className="text-base text-gray-500 mb-2">
                Enter the email you used when you signed up.
              </p>

              {/* Label above, hint below, visible border — HCI Input Form rules */}
              <div>
                <label htmlFor="login-email" className="block text-base font-bold text-gray-800 mb-1">
                  Email address
                </label>
                <input
                  ref={emailRef}
                  type="email"
                  id="login-email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  placeholder="you@example.com"
                  required
                  aria-required="true"
                  aria-invalid={!!fieldError}
                  aria-describedby={fieldError ? 'login-email-error' : 'login-email-hint'}
                  className={`
                    w-full px-4 rounded-2xl bg-gray-50 text-gray-900
                    transition-all duration-200 placeholder:text-gray-400
                    focus:outline-none focus:ring-4 focus:bg-white
                    ${fieldError
                      ? 'border-2 border-red-500 focus:border-red-600 focus:ring-red-100'
                      : 'border-2 border-gray-300 focus:border-blue-600 focus:ring-blue-100'}
                  `}
                  style={{ fontSize: '1.125rem', minHeight: '56px' }}
                />
                {/* Persistent hint below field — doesn't vanish like placeholder */}
                {!fieldError && (
                  <p id="login-email-hint" className="mt-1.5 text-sm text-gray-400">
                    Example: margaret@email.com
                  </p>
                )}
                {/* Inline error directly below field */}
                {fieldError && (
                  <div
                    id="login-email-error"
                    role="alert"
                    aria-live="assertive"
                    className="flex items-center gap-2 mt-2"
                  >
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" aria-hidden="true" />
                    <p className="text-base font-semibold text-red-600">{fieldError}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions — pinned to bottom */}
            <div className="mt-3 flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading || !email.includes('@')}
                aria-busy={loading}
                className="
                  w-full flex items-center justify-center gap-3
                  bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                  disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed
                  text-white font-bold rounded-2xl shadow-lg shadow-blue-200
                  transition-all duration-200
                  focus:outline-none focus:ring-4 focus:ring-blue-300
                "
                style={{ fontSize: '1.125rem', minHeight: '64px' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5" aria-hidden="true" />
                  </>
                )}
              </button>

            </div>
          </form>
        )}

      </main>
    </div>
  );
};

export default Login;


