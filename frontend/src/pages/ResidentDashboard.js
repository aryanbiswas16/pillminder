import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Calendar, Pill, History, Settings, ChevronRight, ClipboardList, LogOut, ArrowLeft, X, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';
import TreatmentsTab from './TreatmentsTab';
import HistoryTab from './HistoryTab';
import SettingsTab from './SettingsTab';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ResidentDashboard = () => {
  const { user, logout } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [takingDose, setTakingDose] = useState(null);
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'treatments' | 'history' | 'settings'
  const [confirmDose, setConfirmDose] = useState(null); // { doseId, action: 'undo'|'take-late', medName }
  const [takeConfirm, setTakeConfirm] = useState(null);  // { doseId, medName } — "Did you take this?"
  const [treatmentsWizardActive, setTreatmentsWizardActive] = useState(false);

  useEffect(() => {
    fetchTodaySchedule();
    // Refresh every minute
    const interval = setInterval(fetchTodaySchedule, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchTodaySchedule = async () => {
    try {
      const response = await axios.get(`${API_URL}/medications/today-schedule`);
      setSchedule(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load your medications');
      setLoading(false);
    }
  };

  // Show confirmation popup before recording a taken dose
  const handleTakeDose = (doseId, medName) => {
    if (!doseId) return;
    setTakeConfirm({ doseId, medName });
  };

  // Called after user confirms
  const handleConfirmTake = async () => {
    if (!takeConfirm) return;
    const { doseId } = takeConfirm;
    setTakeConfirm(null);
    setTakingDose(doseId);
    try {
      await axios.post(`${API_URL}/medications/take-dose/${doseId}`);
      setSchedule(prev => prev.map(item =>
        item.doseId === doseId
          ? { ...item, status: 'taken', takenAt: new Date().toISOString() }
          : item
      ));
    } catch (err) {
      setError('Could not log dose. Please try again.');
    } finally {
      setTakingDose(null);
    }
  };

  const handleConfirmToggle = async () => {
    if (!confirmDose) return;
    const { doseId, action } = confirmDose;
    setConfirmDose(null);
    try {
      await axios.post(`${API_URL}/medications/undo-dose/${doseId}`, { action });
      setSchedule(prev => prev.map(item =>
        item.doseId === doseId
          ? action === 'take-late'
            ? { ...item, status: 'taken', takenAt: new Date().toISOString() }
            : { ...item, status: 'pending', takenAt: null }
          : item
      ));
    } catch (err) {
      setError('Could not update dose. Please try again.');
    }
  };

  // Pick a more accurate emoji icon based on medication name/dosage
  const getMedIcon = (name = '', dosage = '', stored = '💊') => {
    const c = (name + ' ' + dosage).toLowerCase();
    if (/inhaler|puff|aerosol/.test(c)) return '💨';
    if (/injection|insulin|inject|syringe|units\/ml/.test(c)) return '💉';
    if (/syrup|solution|suspension/.test(c)) return '🧴';
    if (/cream|ointment|gel|topical|lotion/.test(c)) return '🩹';
    if (/eye.?drop|ophthalmic/.test(c)) return '👁️';
    if (/patch/.test(c)) return '🩹';
    if (/vitamin|calcium|omega|fish.oil|supplement/.test(c)) return '🫧';
    return stored || '💊';
  };

  // Is a scheduled time in the past right now?
  const isOverdue = (timeStr) => {
    if (!timeStr) return false;
    const [h, m] = timeStr.split(':').map(Number);
    const now = new Date();
    const sched = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    return now > sched;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <p className="text-sm font-bold text-gray-400">Loading medications…</p>
      </div>
    );
  }

  const takenCount = schedule.filter(s => s.status === 'taken').length;
  const totalCount = schedule.length;
  const pct = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  return (
    <div className="h-full flex flex-col bg-gray-50">

      {/* ── Confirmation modal ── */}
      {confirmDose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <p className="text-xl font-extrabold text-gray-900 text-center mb-2">
              {confirmDose.action === 'undo' ? 'Was that a mistake?' : 'Mark as taken?'}
            </p>
            <p className="text-base font-semibold text-gray-600 text-center mb-6">
              {confirmDose.action === 'undo'
                ? `Remove the record that you took "${confirmDose.medName}"?`
                : `"${confirmDose.medName}" — mark as taken late?`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDose(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-lg hover:bg-gray-50"
              >Cancel</button>
              <button
                onClick={handleConfirmToggle}
                className={`flex-1 py-3 rounded-xl text-white font-bold text-lg ${
                  confirmDose.action === 'undo' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {confirmDose.action === 'undo' ? 'Yes, undo it' : 'Yes, I took it'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Take-dose confirmation modal ── */}
      {takeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex justify-end mb-1">
              <button onClick={() => setTakeConfirm(null)} className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-xl font-extrabold text-gray-900 text-center mb-3">Did you just take this? 💊</p>
            <p className="text-base font-semibold text-gray-600 text-center mb-6">
              <span className="font-extrabold text-gray-900">{takeConfirm.medName}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setTakeConfirm(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-lg hover:bg-gray-50"
              >Not yet</button>
              <button
                onClick={handleConfirmTake}
                className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg"
              >Yes, taken ✓</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fixed header ── */}
      <header className="flex-none bg-white border-b-2 border-gray-200 px-4 pt-5 pb-2">
        <div className="flex items-center gap-2">
          {/* Left: back button (returns to Today) or spacer — hidden when treatments wizard is open */}
          {activeTab !== 'today' && !treatmentsWizardActive ? (
            <button
              onClick={() => setActiveTab('today')}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0"
              aria-label="Back to Today"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
          ) : (
            <div className="flex-shrink-0" style={{ width: '44px' }} />
          )}
          {/* Centre: date/greeting or page title */}
          <div className="flex-1 text-center">
            {activeTab === 'today' ? (
              <>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  {format(new Date(), 'EEEE, MMMM do')}
                </p>
                <h1 className="text-2xl font-extrabold text-gray-900">Hello, {user?.firstName} 👋</h1>
              </>
            ) : (
              <h1 className="text-xl font-extrabold text-gray-900">
                {activeTab === 'treatments' ? 'My Meds'
                  : activeTab === 'history' ? 'Past Doses'
                  : 'Settings'}
              </h1>
            )}
          </div>
          {/* Right: settings cog */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
              activeTab === 'settings' ? 'bg-blue-100' : 'bg-gray-100 hover:bg-gray-200'
            }`}
            aria-label="Settings"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <Settings className={`w-6 h-6 ${activeTab === 'settings' ? 'text-blue-600' : 'text-gray-700'}`} />
          </button>
        </div>

        {activeTab === 'today' && (
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between text-sm font-bold text-gray-600 mb-1">
                <span>Today's Progress</span>
                <span>{takenCount}/{totalCount} taken</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-red-400'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <span className={`text-xl font-extrabold ${
              pct === 100 ? 'text-green-600' : pct >= 50 ? 'text-blue-600' : 'text-red-500'
            }`}>{pct}%</span>
          </div>
        )}
      </header>

      {/* ── Tab content ── */}
      {activeTab === 'today' ? (
        <>
          {error && (
            <div className="flex-none mx-4 mt-2 p-3 bg-red-50 border-2 border-red-300 rounded-xl">
              <p className="text-base font-bold text-red-700 text-center">{error}</p>
            </div>
          )}

          <div className="flex-none px-4 pt-3 pb-1">
            <p className="text-sm font-extrabold text-gray-600 uppercase tracking-wider">What to take today</p>
          </div>

          {/* ── Scrollable med list grouped by time ── */}
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            {schedule.length === 0 ? (
              <div className="mt-8 text-center">
                <Check className="w-16 h-16 text-green-500 mx-auto mb-3" />
                <p className="text-xl font-extrabold text-gray-800">All done for today! 🎉</p>
                <p className="text-base text-gray-500 mt-1">No more medications scheduled.</p>
              </div>
            ) : (
              (() => {
                // Group by timeOfDay, sorted chronologically
                const groups = {};
                schedule.forEach(med => {
                  const t = med.timeOfDay || '00:00';
                  if (!groups[t]) groups[t] = [];
                  groups[t].push(med);
                });
                const sortedTimes = Object.keys(groups).sort();

                // 12-hr format helper
                const fmtTime = (t) => {
                  if (!t) return '';
                  const [h, m] = t.split(':').map(Number);
                  const ampm = h >= 12 ? 'PM' : 'AM';
                  const hr = h % 12 || 12;
                  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
                };

                // Is a time slot fully taken?
                const allTaken = (meds) => meds.every(m => m.status === 'taken');
                const anyMissed = (meds) => meds.some(m => m.status === 'missed');
                const hasPending = (meds) => meds.some(m => m.status === 'pending');
                const anyOverduePending = (meds, t) => meds.some(m => m.status === 'pending' && isOverdue(t));

                return sortedTimes.map(time => {
                  const meds = groups[time];
                  const done = allTaken(meds);
                  const missed = !done && (anyMissed(meds) || anyOverduePending(meds, time));
                  const upcoming = !done && !missed && hasPending(meds);
                  return (
                    <div key={time} className="mb-4">
                      {/* ── Time header with low-fi notification bell ── */}
                      <div className={`flex items-center gap-3 px-1 mb-2`}>
                        <div className={`rounded-2xl px-4 py-2 flex items-center gap-2 ${
                          done   ? 'bg-green-100' :
                          missed ? 'bg-red-100'   :
                          'bg-blue-600'
                        }`}>
                          {upcoming && <span className="text-xl" title="Reminder will sound at this time">🔔</span>}
                          <span className={`text-2xl font-extrabold tracking-tight ${
                            done   ? 'text-green-700' :
                            missed ? 'text-red-700'   :
                            'text-white'
                          }`}>{fmtTime(time)}</span>
                        </div>
                        <div className="flex-1 h-0.5 bg-gray-200 rounded" />
                        <span className={`text-sm font-bold ${
                          done ? 'text-green-600' : missed ? 'text-red-500' : 'text-gray-500'
                        }`}>
                          {done ? '✓ All done' : `${meds.filter(m => m.status === 'taken').length}/${meds.length}`}
                        </span>
                      </div>

                      {/* ── Medication cards ── */}
                      <div className="space-y-2 pl-1">
                        {meds.map(med => {
                          const isTaken  = med.status === 'taken';
                          const isMissed = med.status === 'missed';
                          const isLate   = med.status === 'pending' && isOverdue(time);
                          const icon     = getMedIcon(med.medicationName, med.dosage, med.icon);
                          return (
                            <div
                              key={med.doseId || med.scheduleId}
                              className={`rounded-2xl p-3 border-2 flex items-center gap-3 ${
                                isTaken  ? 'bg-green-50 border-green-400' :
                                isMissed ? 'bg-red-50 border-red-400' :
                                isLate   ? 'bg-red-100 border-red-500 border-2' :
                                'bg-white border-gray-200'
                              }`}
                            >
                              {/* Emoji icon */}
                              <div
                                className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                                style={{ backgroundColor: (med.color || '#3B82F6') + '25' }}
                              >
                                {icon}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-lg font-bold text-gray-900 truncate">{med.medicationName}</p>
                                <p className="text-sm font-semibold text-gray-600">{med.dosageAmount} · {med.dosage}</p>
                                {isLate && (
                                  <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                                    ⚠ Overdue
                                  </span>
                                )}
                              </div>

                              {/* Action */}
                              <div className="flex-shrink-0">
                                {isTaken ? (
                                  <button
                                    onClick={() => setConfirmDose({ doseId: med.doseId, action: 'undo', medName: med.medicationName })}
                                    className="flex flex-col items-center active:scale-95 transition-transform"
                                    title="Tap to undo"
                                  >
                                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-300 hover:bg-green-200">
                                      <Check className="w-7 h-7 text-green-600" strokeWidth={3} />
                                    </div>
                                    <span className="text-xs font-bold text-green-700 mt-0.5">Taken ✓</span>
                                    <span className="text-xs text-gray-400 leading-tight">Tap to undo</span>
                                  </button>
                                ) : (isMissed || isLate) ? (
                                  <button
                                    onClick={() => setConfirmDose({ doseId: med.doseId, action: 'take-late', medName: med.medicationName })}
                                    className="flex flex-col items-center active:scale-95 transition-transform"
                                    title="Tap if you took this late"
                                  >
                                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center border-2 border-orange-300 hover:bg-orange-200">
                                      <Clock className="w-7 h-7 text-orange-500" strokeWidth={2.5} />
                                    </div>
                                    <span className="text-xs font-bold text-orange-600 mt-0.5">I took it</span>
                                    <span className="text-xs text-gray-400 leading-tight">Tap to record</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleTakeDose(med.doseId, med.medicationName)}
                                    disabled={takingDose === med.doseId}
                                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-base font-bold px-5 py-3 rounded-xl shadow transition-all disabled:opacity-50"
                                    style={{ minWidth: '72px', minHeight: '48px' }}
                                  >
                                    {takingDose === med.doseId ? 'Saving...' : 'I took this ✓'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </>
      ) : activeTab === 'treatments' ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TreatmentsTab residentId={user?.id} onWizardStateChange={setTreatmentsWizardActive} />
        </div>
      ) : activeTab === 'history' ? (
        <HistoryTab />
      ) : (
        <SettingsTab />
      )}

      {/* ── Bottom tab bar (Fitts' Law: large targets, thumb zone) ── */}
      <nav className="flex-none bg-white border-t-2 border-gray-200 flex" role="tablist">
        {[
          { id: 'today',      label: 'Today',    sublabel: 'My Medications', Icon: Calendar },
          { id: 'treatments', label: 'My Meds',  sublabel: 'Add & Edit',     Icon: Pill },
          { id: 'history',    label: 'History',  sublabel: 'Past Doses',     Icon: ClipboardList },
        ].map(({ id, label, sublabel, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(id)}
              className={`
                flex-1 flex flex-col items-center justify-center gap-0 py-2
                transition-colors
                ${active
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }
              `}
              style={{ minHeight: '64px' }}
            >
              <Icon className={`w-7 h-7 mb-0.5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className={`text-sm font-extrabold leading-tight ${active ? 'text-blue-600' : 'text-gray-500'}`}>{label}</span>
              <span className={`text-xs font-semibold leading-tight ${active ? 'text-blue-400' : 'text-gray-400'}`}>{sublabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default ResidentDashboard;
