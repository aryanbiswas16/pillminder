import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const FONT_OPTIONS = [
  { scale: 1.0,  label: 'Normal',      preview: 'Aa' },
  { scale: 1.15, label: 'Large',        preview: 'Aa' },
  { scale: 1.30, label: 'Extra Large',  preview: 'Aa' },
];

const LANGUAGES = [
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'es', label: 'Español',    flag: '🇪🇸' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'zh', label: '中文',       flag: '🇨🇳' },
  { code: 'ko', label: '한국어',     flag: '🇰🇷' },
];

const SettingsTab = () => {
  const { user, logout, settings, updateSettings } = useAuth();
  const [saved, setSaved] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  /* ── Prototype-only accessibility state ── */
  const [acc, setAcc] = useState({
    textToSpeech: false,
    language: 'en',
    reduceMotion: false,
    largeButtons: false,
    screenReader: false,
  });
  const toggleAcc = (key) => setAcc(prev => ({ ...prev, [key]: !prev[key] }));
  const setLang   = (code) => setAcc(prev => ({ ...prev, language: code }));

  const handleFontScale = (scale) => {
    updateSettings({ fontScale: scale });
    flashSaved();
  };

  const handleContrast = (val) => {
    updateSettings({ highContrast: val });
    flashSaved();
  };

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const currentScale = settings?.fontScale ?? 1.0;
  const highContrast  = settings?.highContrast ?? false;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 pb-24">

      {/* ── Saved banner ── */}
      {saved && (
        <div
          role="status"
          aria-live="polite"
          className="bg-green-100 border border-green-400 text-green-800 font-bold text-center rounded-xl px-4 py-3 text-lg"
        >
          ✅ Saved!
        </div>
      )}

      {/* ── Profile card ── */}
      <section aria-labelledby="profile-heading" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <h2 id="profile-heading" className="text-lg font-bold text-gray-500 uppercase tracking-wide mb-4">
          My Profile
        </h2>
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
            aria-hidden="true"
          >
            {(user?.firstName?.[0] ?? '?')}{(user?.lastName?.[0] ?? '')}
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{user?.firstName} {user?.lastName}</p>
            <p className="text-base text-gray-500">{user?.email}</p>
          </div>
        </div>
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <ProfileRow label="Role"  value={user?.role === 'resident' ? '🏠 Resident' : user?.role === 'nurse' ? '💉 Nurse' : '👥 Caregiver'} />
          {user?.room && <ProfileRow label="Room" value={`Room ${user.room}`} />}
          {user?.phone && <ProfileRow label="Phone" value={user.phone} />}
        </div>
      </section>

      {/* ── Text Size ── */}
      <section aria-labelledby="textsize-heading" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <h2 id="textsize-heading" className="text-lg font-bold text-gray-500 uppercase tracking-wide mb-1">
          Text Size
        </h2>
        <p className="text-base text-gray-500 mb-4">Choose the size that's easiest to read.</p>
        <div className="flex gap-3">
          {FONT_OPTIONS.map(({ scale, label, preview }) => {
            const active = Math.abs(currentScale - scale) < 0.05;
            return (
              <button
                key={scale}
                onClick={() => handleFontScale(scale)}
                aria-pressed={active}
                className={`
                  flex-1 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 py-4 px-2 transition-all
                  ${active
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                  }
                `}
                style={{ minHeight: '80px' }}
              >
                <span style={{ fontSize: `${1 + (scale - 1) * 2}rem`, fontWeight: 700, lineHeight: 1 }}>{preview}</span>
                <span className="font-bold text-sm">{label}</span>
                {active && <span className="text-xs font-bold text-blue-500">✓ Selected</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── High Contrast ── */}
      <section aria-labelledby="contrast-heading" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <h2 id="contrast-heading" className="text-lg font-bold text-gray-500 uppercase tracking-wide mb-1">
          High Contrast
        </h2>
        <p className="text-base text-gray-500 mb-4">Makes text and buttons easier to see.</p>
        <div className="flex gap-3">
          {[
            { val: false, label: 'Standard', icon: '🌤' },
            { val: true,  label: 'High Contrast', icon: '🌑' },
          ].map(({ val, label, icon }) => {
            const active = highContrast === val;
            return (
              <button
                key={String(val)}
                onClick={() => handleContrast(val)}
                aria-pressed={active}
                className={`
                  flex-1 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 py-4 px-2 transition-all
                  ${active
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                  }
                `}
                style={{ minHeight: '80px' }}
              >
                <span className="text-3xl">{icon}</span>
                <span className="font-bold text-sm text-center">{label}</span>
                {active && <span className="text-xs font-bold text-blue-500">✓ Selected</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Accessibility ── */}
      <section aria-labelledby="a11y-heading" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
        <div>
          <h2 id="a11y-heading" className="text-lg font-bold text-gray-500 uppercase tracking-wide mb-1">
            ♿ Accessibility
          </h2>
          <p className="text-sm font-bold text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">⚠️ These options are coming soon and not yet active.</p>
        </div>

        {/* Toggle rows */}
        {[
          { key: 'textToSpeech', icon: '🔊', label: 'Text-to-Speech', desc: 'Read buttons and labels aloud' },
          { key: 'reduceMotion',  icon: '🌀', label: 'Reduce Motion',  desc: 'Minimise animations and transitions' },
          { key: 'largeButtons',  icon: '👆', label: 'Large Tap Targets', desc: 'Bigger buttons — easier to press' },
          { key: 'screenReader',  icon: '👁️', label: 'Screen Reader Mode', desc: 'Optimised layout for VoiceOver / TalkBack' },
        ].map(({ key, icon, label, desc }) => (
          <div key={key} className="flex items-center justify-between gap-3 py-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">{icon}</span>
              <div>
                <p className="text-base font-bold text-gray-900">{label}</p>
                <p className="text-sm text-gray-400">{desc}</p>
              </div>
            </div>
            <button
              onClick={() => toggleAcc(key)}
              role="switch"
              aria-checked={acc[key]}
              aria-label={label}
              className={`relative inline-flex w-14 h-8 items-center rounded-full border-2 transition-colors flex-shrink-0 ${
                acc[key] ? 'bg-blue-600 border-blue-700' : 'bg-gray-200 border-gray-300'
              }`}
              style={{ minWidth: '56px', minHeight: '40px' }}
            >
              <span className={`absolute w-5 h-5 rounded-full bg-white shadow transition-transform ${
                acc[key] ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>
        ))}

        {/* Language selector */}
        <div>
          <p className="text-base font-bold text-gray-900 mb-2">🌍 Language</p>
          <div className="grid grid-cols-3 gap-2">
            {LANGUAGES.map(({ code, label, flag }) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                aria-pressed={acc.language === code}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-3 px-1 transition-all active:scale-95 ${
                  acc.language === code
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
                style={{ minHeight: '72px' }}
              >
                <span className="text-2xl">{flag}</span>
                <span className="text-xs font-bold text-center">{label}</span>
                {acc.language === code && <span className="text-xs font-bold text-blue-500">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section aria-labelledby="about-heading" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <h2 id="about-heading" className="text-lg font-bold text-gray-500 uppercase tracking-wide mb-3">
          About
        </h2>
        <div className="space-y-2 text-base text-gray-600">
          <p className="flex justify-between"><span className="font-semibold text-gray-800">App</span><span>💊 PillMinder</span></p>
          <p className="flex justify-between"><span className="font-semibold text-gray-800">Version</span><span>1.0 (Demo)</span></p>
          <p className="flex justify-between"><span className="font-semibold text-gray-800">Support</span><span>Ask your care team</span></p>
        </div>
      </section>

      {/* ── Sign out ── */}
      <button
        onClick={() => setConfirmLogout(true)}
        className="w-full bg-red-50 border-2 border-red-200 text-red-700 font-bold text-xl rounded-2xl py-4 hover:bg-red-100 active:scale-95 transition-all"
        style={{ minHeight: '64px' }}
      >
        🚪 Sign Out
      </button>

      {/* ── Sign-out confirmation modal ── */}
      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <p className="text-2xl text-center mb-2">🚪</p>
            <p className="text-xl font-extrabold text-gray-900 text-center mb-2">Sign Out?</p>
            <p className="text-base font-semibold text-gray-600 text-center mb-6">
              You will need to sign back in to view your medications.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-lg hover:bg-gray-50"
              >Cancel</button>
              <button
                onClick={logout}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-lg"
              >Yes, Sign Out</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const ProfileRow = ({ label, value }) => (
  <div className="flex justify-between items-center py-1">
    <span className="font-semibold text-gray-500 text-base">{label}</span>
    <span className="font-bold text-gray-900 text-base">{value}</span>
  </div>
);

export default SettingsTab;
