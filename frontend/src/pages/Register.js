import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Pill, User, Heart, ArrowRight, ArrowLeft,
  CheckCircle, Mail, AlertCircle, Shield, Sparkles,
} from 'lucide-react';

/* ═══════════════════════ HCI CONSTANTS ═══════════════════════════ */

/*
 * Step map (Hick's Law — one decision per screen):
 *   0 = Welcome splash (onboarding image / purpose)
 *   1 = Role selection
 *   2 = Name (first + last)
 *   3 = Email
 *   4 = Link resident (caregiver only)
 *   5 = Review & confirm
 */
const STEP_LABELS = ['Welcome', 'Role', 'Name', 'Email', 'Link', 'Review'];

const ROLE_OPTIONS = [
  {
    key: 'resident',
    heading: 'I take medications',
    sub: 'Resident',
    icon: User,
    activeBg: 'bg-blue-100',  activeBorder: 'border-blue-600',
    iconActiveBg: 'bg-blue-600', iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600', border: 'border-blue-200', bg: 'bg-blue-50',
  },
  {
    key: 'caregiver',
    heading: 'I care for someone',
    sub: 'Caregiver / Nurse',
    icon: Heart,
    activeBg: 'bg-rose-100',  activeBorder: 'border-rose-600',
    iconActiveBg: 'bg-rose-600', iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600', border: 'border-rose-200', bg: 'bg-rose-50',
  },
];

/* ══════════════ Reusable form input (Input Form Best Practices) ══ */

const FormInput = ({
  id, label, hint, type = 'text', value, onChange,
  placeholder, autoComplete, error, inputRef,
}) => (
  <div>
    {/* HCI: Labels always above the field — never placeholder-only */}
    <label htmlFor={id} className="block text-xl font-bold text-gray-800 mb-1">
      {label}
    </label>
    <input
      ref={inputRef}
      id={id}
      type={type}
      autoComplete={autoComplete}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      aria-required="true"
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      className={`
        w-full px-5 rounded-2xl bg-gray-50 text-gray-900
        transition-all duration-200 placeholder:text-gray-400
        focus:outline-none focus:ring-4 focus:bg-white
        ${error
          ? 'border-3 border-red-500 focus:border-red-600 focus:ring-red-100'
          : 'border-2 border-gray-300 focus:border-blue-600 focus:ring-blue-100'}
      `}
      style={{ fontSize: '1.125rem', minHeight: '56px' }}
    />
    {/* HCI: Format hint persists below field — never disappears like placeholder */}
    {!error && hint && (
      <p id={`${id}-hint`} className="mt-1 text-sm text-gray-400">{hint}</p>
    )}
    {/* HCI: Inline error next to offending field — not a top banner */}
    {error && (
      <div id={`${id}-error`} role="alert" aria-live="assertive" className="flex items-center gap-2 mt-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" aria-hidden="true" />
        <p className="text-lg font-semibold text-red-600">{error}</p>
      </div>
    )}
  </div>
);

/* ══════════════ Progress bar (Zeigarnik Effect) ══════════════════ */

const ProgressBar = ({ current, total, label }) => {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="mb-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
      aria-label={`Step ${current} of ${total}: ${label}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-gray-500">Step {current} of {total}</span>
        <span className="text-sm font-bold text-blue-600">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

/* ═════════════════════ Review row (for confirm step) ═════════════ */

const ReviewRow = ({ label, value, onEdit }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
    <div>
      <p className="text-sm font-semibold text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value || '—'}</p>
    </div>
    <button
      type="button"
      onClick={onEdit}
      className="text-blue-600 font-bold text-lg underline underline-offset-2
        focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-2 py-1"
      style={{ minHeight: '48px', minWidth: '48px' }}
    >
      Edit
    </button>
  </div>
);

/* ═══════════════════════ MAIN COMPONENT ══════════════════════════ */

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]                   = useState(0); // 0 = welcome
  const [role, setRole]                   = useState('');
  const [firstName, setFirstName]         = useState('');
  const [lastName, setLastName]           = useState('');
  const [email, setEmail]                 = useState('');
  const [residentEmail, setResidentEmail] = useState('');
  const [errors, setErrors]               = useState({});
  const [loading, setLoading]             = useState(false);
  const [done, setDone]                   = useState(false);

  const firstNameRef = useRef(null);
  const lastNameRef  = useRef(null);
  const emailRef     = useRef(null);
  const resEmailRef  = useRef(null);

  // Compute total steps dynamically (caregiver adds the link-resident step)
  const getSteps = () => {
    // 0=welcome, 1=role, 2=name, 3=email, 4=link(caregiver), 5=review
    if (role === 'caregiver') return [0, 1, 2, 3, 4, 5];
    return [0, 1, 2, 3, 5]; // residents skip step 4
  };
  const steps = getSteps();
  const stepIndex = steps.indexOf(step);
  const totalUserSteps = steps.length - 1; // exclude welcome from count shown
  const currentUserStep = Math.max(stepIndex, 0); // 0-based

  // HCI: Auto-focus the first input when entering a step
  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 2 && firstNameRef.current) firstNameRef.current.focus();
      if (step === 3 && emailRef.current) emailRef.current.focus();
      if (step === 4 && resEmailRef.current) resEmailRef.current.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [step]);

  const clearError = (field) => setErrors(prev => { const c = { ...prev }; delete c[field]; return c; });
  const clearAllErrors = () => setErrors({});

  /* ── Navigation (Hick's Law: one step at a time) ── */
  const goNext = () => {
    clearAllErrors();
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };
  const goBack = () => {
    clearAllErrors();
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };
  const goToStep = (s) => { clearAllErrors(); setStep(s); };

  /* ── Validation per step (inline field errors) ── */
  const validate = () => {
    const e = {};
    if (step === 1 && !role) {
      e.role = 'Please choose one of the options above.';
    }
    if (step === 2) {
      if (!firstName.trim()) e.firstName = 'Please enter your first name.';
      if (!lastName.trim())  e.lastName = 'Please enter your last name.';
    }
    if (step === 3) {
      if (!email.includes('@') || email.length < 5) e.email = 'Please enter a valid email address.';
    }
    if (step === 4 && residentEmail && !residentEmail.includes('@')) {
      e.residentEmail = "This doesn't look like a valid email.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validate()) goNext(); };

  /* ── Final submit ── */
  const handleFinish = async () => {
    setLoading(true);
    await register({ firstName, lastName, email, role, linkedResidentEmail: residentEmail || null });
    setLoading(false);
    setDone(true);
  };

  /* ═══════════ SUCCESS SCREEN ═══════════ */
  if (done) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-gradient-to-b from-blue-700 to-blue-500 px-6 text-center">
        <main className="bg-white rounded-3xl shadow-2xl p-10 max-w-sm w-full">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">You're all set!</h2>
          <p className="text-lg text-gray-500 mb-2">
            Welcome, <span className="font-bold text-gray-800">{firstName}</span>.
          </p>
          {role === 'caregiver' && residentEmail && (
            <div className="flex items-center gap-3 mt-4 mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl text-left">
              <Mail className="w-8 h-8 text-blue-600 flex-shrink-0" aria-hidden="true" />
              <p className="text-lg text-blue-800">
                An invitation link was sent to{' '}
                <span className="font-bold">{residentEmail}</span>.
              </p>
            </div>
          )}
          <button
            onClick={() => navigate('/login')}
            className="
              w-full flex items-center justify-center gap-3 mt-4
              bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl
              shadow-lg shadow-blue-200
              focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all
            "
            style={{ fontSize: '1.125rem', minHeight: '64px' }}
          >
            Sign In Now
            <ArrowRight className="w-6 h-6" aria-hidden="true" />
          </button>
        </main>
      </div>
    );
  }

  const isLastStep = step === 5;

  /* ═══════════ MULTI-STEP FORM ═══════════ */
  return (
    <div className="min-h-full flex flex-col bg-gradient-to-b from-blue-700 to-blue-500">

      {/* ── Header with back button (only on steps 1+) ── */}
      {step > 0 && (
        <div className="flex items-center gap-3 px-4 pt-4 pb-1">
          <button
            onClick={step <= 1 ? () => navigate('/login') : goBack}
            aria-label="Go back"
            className="
              w-12 h-12 flex items-center justify-center rounded-xl bg-white/20
              text-white hover:bg-white/30 transition-all
              focus:outline-none focus:ring-4 focus:ring-white/40 flex-shrink-0
            "
          >
            <ArrowLeft className="w-6 h-6" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Pill className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold text-white">Create Account</h1>
          </div>
        </div>
      )}

      {/* ── White card body ── */}
      {/*
        Step 0 uses justify-center (centred splash).
        Steps 1-5 use content-top / CTA-bottom:
          • flex-1 inner div keeps questions at the top
          • actions div naturally pins to the bottom (thumb zone)
      */}
      <main className={`flex-1 flex flex-col bg-white shadow-2xl px-5 pt-3 pb-4 rounded-t-3xl
        ${step === 0 ? 'justify-center' : ''}`}>

        {/* ═══ STEP 0 — Welcome / Onboarding Splash ═══ */}
        {step === 0 && (
          <div className="flex flex-col items-center text-center px-2 pt-2">
            {/* HCI Onboarding: image/icon reflecting user + welcoming feel */}
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-2" aria-hidden="true">
              <Sparkles className="w-7 h-7 text-blue-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
              Never worry about your medications again
            </h2>
            <p className="text-base text-gray-500 mb-1 leading-relaxed">
              PillMinder makes it simple to track your daily medication
              and gives your family peace of mind.
            </p>
            <ul className="text-left w-full max-w-xs mx-auto mt-2 mb-3 space-y-1.5">
              {[
                { icon: CheckCircle, text: 'See at a glance if you took your meds' },
                { icon: Shield,      text: 'Caregivers get automatic updates' },
                { icon: Heart,       text: 'Designed for simplicity & ease' },
              ].map(({ icon: Ic, text }, i) => (
                <li key={i} className="flex items-center gap-3">
                  <Ic className="w-5 h-5 text-green-600 flex-shrink-0" aria-hidden="true" />
                  <span className="text-base text-gray-700 font-medium">{text}</span>
                </li>
              ))}
            </ul>

            {/* HCI: Von Restorff — primary CTA dominates visually */}
            <button
              type="button"
              onClick={() => setStep(1)}
              className="
                w-full flex items-center justify-center gap-3
                bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                text-white font-bold rounded-2xl shadow-lg shadow-blue-200
                transition-all duration-200
                focus:outline-none focus:ring-4 focus:ring-blue-300
              "
              style={{ fontSize: '1.25rem', minHeight: '64px' }}
            >
              Get Started
              <ArrowRight className="w-6 h-6" aria-hidden="true" />
            </button>

            <p className="text-center text-base text-gray-500 mt-2">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-bold text-blue-600 underline underline-offset-4
                  focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
              >
                Sign in
              </Link>
            </p>
          </div>
        )}

        {/* Steps 1–5: content at top (flex-1), CTA pinned to bottom (thumb zone) */}
        {step > 0 && (
          <>
            {/* ── Content — grows to fill space, questions stay near top ── */}
            <div className="flex-1">

              {/* Progress bar (Zeigarnik Effect — not on review step) */}
              {step < 5 && (
                <ProgressBar
                  current={currentUserStep}
                  total={totalUserSteps}
                  label={STEP_LABELS[step] || ''}
                />
              )}

              {/* ══ STEP 1 — Role (Hick's Law: 2 options only) ══ */}
              {step === 1 && (
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Who are you?</h2>
                  <p className="text-base text-gray-500 mb-2">Choose the option that best describes you.</p>

                  <fieldset>
                    <legend className="sr-only">Select your role</legend>
                    <div className="flex flex-col gap-3" role="radiogroup" aria-label="Role selection">
                      {ROLE_OPTIONS.map(({ key, heading, sub, icon: Icon, bg, border, activeBg, activeBorder, iconActiveBg, iconBg, iconColor }) => {
                        const active = role === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => { setRole(key); clearError('role'); }}
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
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                                ${active ? iconActiveBg : iconBg}`}
                              aria-hidden="true"
                            >
                              <Icon className={`w-6 h-6 ${active ? 'text-white' : iconColor}`} />
                            </div>
                            <div className="flex-1">
                              <p className="text-lg font-bold text-gray-900 leading-tight">{heading}</p>
                              <p className={`text-sm font-medium mt-0.5 ${active ? 'text-gray-600' : 'text-gray-400'}`}>{sub}</p>
                            </div>
                            {active && (
                              <div className={`w-8 h-8 rounded-full ${iconActiveBg} flex items-center justify-center flex-shrink-0`} aria-hidden="true">
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

                  {errors.role && (
                    <div role="alert" aria-live="assertive" className="flex items-center gap-3 mt-3 p-3 bg-red-50 border-2 border-red-300 rounded-xl">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" aria-hidden="true" />
                      <p className="text-base font-semibold text-red-700">{errors.role}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ══ STEP 2 — Name (Miller's Law: 2 fields max) ══ */}
              {step === 2 && (
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 mb-1">What's your name?</h2>
                  <p className="text-base text-gray-500 mb-2">We'll use this to personalise your experience.</p>
                  <div className="flex flex-col gap-3">
                    <FormInput id="firstName" label="First name" value={firstName}
                      onChange={e => { setFirstName(e.target.value); clearError('firstName'); }}
                      placeholder="e.g. Margaret" autoComplete="given-name"
                      error={errors.firstName} inputRef={firstNameRef}
                      hint="Your given name" />
                    <FormInput id="lastName" label="Last name" value={lastName}
                      onChange={e => { setLastName(e.target.value); clearError('lastName'); }}
                      placeholder="e.g. Thompson" autoComplete="family-name"
                      error={errors.lastName} inputRef={lastNameRef}
                      hint="Your family or surname" />
                  </div>
                </div>
              )}

              {/* ══ STEP 3 — Email ══ */}
              {step === 3 && (
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Your email address</h2>
                  <p className="text-base text-gray-500 mb-2">This is how you'll sign in. We'll never share it.</p>
                  <FormInput id="email" type="email" label="Email address" value={email}
                    onChange={e => { setEmail(e.target.value); clearError('email'); }}
                    placeholder="you@example.com" autoComplete="email"
                    error={errors.email} inputRef={emailRef}
                    hint="Example: margaret@email.com" />
                </div>
              )}

              {/* ══ STEP 4 — Link resident (caregiver only) ══ */}
              {step === 4 && role === 'caregiver' && (
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Who do you care for?</h2>
                  <p className="text-base text-gray-500 mb-2">
                    Enter their email and we'll send an invitation link.
                    This step is optional — you can add them later.
                  </p>
                  <FormInput id="residentEmail" type="email" label="Their email address" value={residentEmail}
                    onChange={e => { setResidentEmail(e.target.value); clearError('residentEmail'); }}
                    placeholder="resident@example.com" autoComplete="off"
                    error={errors.residentEmail} inputRef={resEmailRef}
                    hint="Optional — leave blank to skip" />

                  {/* Immediate feedback when valid email entered */}
                  {residentEmail.includes('@') && !errors.residentEmail && (
                    <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
                      <Mail className="w-6 h-6 text-blue-600 flex-shrink-0" aria-hidden="true" />
                      <p className="text-base text-blue-800">
                        An invitation will be sent to{' '}<span className="font-bold">{residentEmail}</span>.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ══ STEP 5 — Review & Confirm ══ */}
              {step === 5 && (
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Review your details</h2>
                  <p className="text-base text-gray-500 mb-2">Please confirm everything looks correct.</p>

                  <div className="bg-gray-50 rounded-2xl border-2 border-gray-200 px-4 py-1 mb-3">
                    <ReviewRow label="Role" value={role === 'caregiver' ? 'Caregiver / Nurse' : 'Resident'} onEdit={() => goToStep(1)} />
                    <ReviewRow label="Name" value={`${firstName} ${lastName}`} onEdit={() => goToStep(2)} />
                    <ReviewRow label="Email" value={email} onEdit={() => goToStep(3)} />
                    {role === 'caregiver' && (
                      <ReviewRow
                        label="Caring for"
                        value={residentEmail || 'Not linked yet'}
                        onEdit={() => goToStep(4)}
                      />
                    )}
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-green-50 border-2 border-green-200 rounded-xl">
                    <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm text-green-800">
                      Your data is private. We only use your email to sign in and connect with your caregiver.
                    </p>
                  </div>
                </div>
              )}

            </div>{/* end content */}

            {/* ── Actions — pinned to bottom (thumb zone, Fitts' Law) ── */}
            <div className="mt-3">
              {/* Von Restorff: primary CTA is visually dominant */}
              <button
                type="button"
                onClick={isLastStep ? handleFinish : handleNext}
                disabled={loading}
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
                    Creating your account…
                  </>
                ) : isLastStep ? (
                  <>
                    Create My Account
                    <CheckCircle className="w-6 h-6" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-6 h-6" aria-hidden="true" />
                  </>
                )}
              </button>

              {/* Skip — optional step only, subdued (Von Restorff) */}
              {step === 4 && role === 'caregiver' && (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={loading}
                  className="
                    w-full mt-3 flex items-center justify-center
                    text-base font-semibold text-gray-500 underline underline-offset-4
                    focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-2xl
                    disabled:opacity-40 transition-all
                  "
                  style={{ minHeight: '48px' }}
                >
                  Skip for now
                </button>
              )}

              {/* Sign-in link on step 1 */}
              {step === 1 && (
                <p className="text-center text-base text-gray-500 mt-3">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-bold text-blue-600 underline underline-offset-4
                      focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                  >
                    Sign in
                  </Link>
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Register;
