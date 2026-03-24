import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Pill, ClipboardList,
  Check, X, Clock, ChevronLeft, ChevronRight, Download,
  User, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, isFuture, addMonths, subMonths } from 'date-fns';
import TreatmentsTab from './TreatmentsTab';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/* ── helpers (mirrors HistoryTab) ── */
const toKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const friendlyDate = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today - target) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

/* ══════════════════════════════════════════
   ResidentManagePage
   Caregiver / nurse view of a single resident.
   Tabs: Today  |  Treatments  |  History
   ══════════════════════════════════════════ */
const ResidentManagePage = () => {
  const { residentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNurse = user?.role === 'nurse';

  const [activeTab, setActiveTab] = useState('today');
  const [residentName, setResidentName] = useState('');
  const [treatmentsWizardActive, setTreatmentsWizardActive] = useState(false);

  /* ── Today tab state ── */
  const [todayDoses, setTodayDoses] = useState([]);
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayError, setTodayError] = useState(null);
  const [markingDose, setMarkingDose] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [adminDoseId, setAdminDoseId] = useState(null);
  const [markSuccess, setMarkSuccess] = useState(null);

  /* ── History tab state ── */
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayPopup, setDayPopup] = useState(null);

  /* ── Fetch today's schedule (reuses /dashboard/resident/:id/history?days=1) ── */
  const fetchToday = async () => {
    try {
      const res = await axios.get(`${API_URL}/dashboard/resident/${residentId}/history?days=1`);
      const todayStr = toKey(new Date());
      const todayEntry = res.data.find(d => d.date === todayStr);
      setTodayDoses(todayEntry?.doses || []);
      // grab the resident name from the first entry if available
      if (res.data[0]?.residentName) setResidentName(res.data[0].residentName);
    } catch {
      setTodayError('Could not load today\'s schedule.');
    } finally {
      setTodayLoading(false);
    }
  };

  /* ── Fetch full history ── */
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${API_URL}/dashboard/resident/${residentId}/history?days=60`);
      setHistory(res.data);
      if (!residentName && res.data[0]?.residentName) setResidentName(res.data[0].residentName);
    } catch {
      setHistoryError('Could not load history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  /* ── Fetch caregiver dashboard to get resident name ── */
  useEffect(() => {
    const fetchResidentName = async () => {
      try {
        const res = await axios.get(`${API_URL}/dashboard/caregiver`);
        const match = res.data.find(r => String(r.residentId) === String(residentId));
        if (match) setResidentName(match.residentName);
      } catch {}
    };
    fetchResidentName();
    fetchToday();
    // Auto-refresh today every 60 s (WatchOS Actionable — always current)
    const interval = setInterval(fetchToday, 60000);
    return () => clearInterval(interval);
  }, [residentId]); // eslint-disable-line

  // Lazy-load history only when that tab is first opened
  useEffect(() => {
    if (activeTab === 'history' && history.length === 0 && !historyLoading) {
      fetchHistory();
    }
  }, [activeTab]); // eslint-disable-line

  /* ── Mark administered (nurse) ── */
  const handleMarkAdministered = async (doseId) => {
    setMarkingDose(doseId);
    try {
      await axios.post(`${API_URL}/medications/take-dose/${doseId}`, {
        notes: adminNote || undefined,
      });
      setAdminDoseId(null);
      setAdminNote('');
      setMarkSuccess(doseId);
      setTimeout(() => setMarkSuccess(null), 3000);
      fetchToday();
    } catch {
      setTodayError('Could not record dose. Please try again.');
    } finally {
      setMarkingDose(null);
    }
  };

  /* ══════════ TODAY helpers ══════════ */
  const takenCount = todayDoses.filter(d => d.status === 'taken').length;
  const totalCount = todayDoses.length;
  const pct = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  const isOverdue = (timeStr) => {
    if (!timeStr) return false;
    const dt = new Date(timeStr);
    return new Date() > dt;
  };

  // Group doses by scheduled time (HH:MM extracted from ISO string)
  const groupedDoses = useMemo(() => {
    const groups = {};
    todayDoses.forEach(dose => {
      const key = dose.scheduledTime
        ? format(parseISO(dose.scheduledTime), 'HH:mm')
        : '00:00';
      if (!groups[key]) groups[key] = [];
      groups[key].push(dose);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [todayDoses]);

  const fmtTime = (t) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  /* ══════════ HISTORY helpers ══════════ */
  const summaryMap = useMemo(() => {
    const m = {};
    history.forEach(day => { m[day.date] = day; });
    return m;
  }, [history]);

  const calendarWeeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd   = endOfMonth(currentMonth);
    const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd     = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const weeks = [];
    let day = calStart;
    while (day <= calEnd) {
      const week = [];
      for (let i = 0; i < 7; i++) { week.push(new Date(day)); day = addDays(day, 1); }
      weeks.push(week);
    }
    return weeks;
  }, [currentMonth]);

  const canGoNext = currentMonth < new Date();

  const cellColor = (date) => {
    const ds = format(date, 'yyyy-MM-dd');
    const summary = summaryMap[ds];
    if (isFuture(date) && !isToday(date)) return { bg: 'bg-gray-100', text: 'text-gray-300', dot: null };
    if (!summary) return { bg: '', text: 'text-gray-400', dot: null };
    if (summary.adherenceRate === 100) return { bg: '', text: 'text-gray-800', dot: 'bg-green-500' };
    if (summary.adherenceRate > 0)    return { bg: '', text: 'text-gray-800', dot: 'bg-yellow-500' };
    return { bg: '', text: 'text-gray-800', dot: 'bg-red-500' };
  };

  /* ══════════ CSV export ══════════ */
  const handleExport = () => {
    const rows = [['Date', 'Medication', 'Dosage', 'Status', 'Scheduled Time', 'Taken At']];
    history.forEach(day => {
      day.doses.forEach(d => {
        rows.push([
          day.date,
          d.medicationName || '',
          d.dosage || '',
          d.status || '',
          d.scheduledTime ? new Date(d.scheduledTime).toLocaleTimeString() : '',
          d.takenAt ? new Date(d.takenAt).toLocaleString() : '',
        ]);
      });
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${residentName || 'resident'}-history.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  /* ══════════ RENDER ══════════ */
  return (
    <div className="h-full flex flex-col bg-gray-50">

      {/* Day-detail popup (History tab) */}
      {dayPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setDayPopup(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[75vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className={`px-5 py-4 rounded-t-2xl flex-shrink-0 ${
              dayPopup.adherenceRate === 100 ? 'bg-green-50' :
              dayPopup.adherenceRate > 0 ? 'bg-yellow-50' : 'bg-red-50'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-extrabold text-gray-900">{friendlyDate(dayPopup.date)}</p>
                  <p className="text-base font-bold text-gray-600">
                    {dayPopup.adherenceRate === 100
                      ? `✅ All doses taken`
                      : dayPopup.adherenceRate === 0
                        ? `❌ No doses taken`
                        : `⚠️ ${dayPopup.doses.filter(d => d.status === 'taken').length} of ${dayPopup.doses.length} taken`}
                  </p>
                </div>
                <button
                  onClick={() => setDayPopup(null)}
                  className="w-10 h-10 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center active:scale-95 transition-all"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-600" strokeWidth={2.5} />
                </button>
              </div>
            </div>
            <div className="px-4 pt-3 pb-4 space-y-2 overflow-y-auto flex-1">
              {dayPopup.doses?.map(dose => {
                const isTaken  = dose.status === 'taken';
                const isMissed = dose.status === 'missed';
                return (
                  <div
                    key={dose.id}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border-2 ${
                      isTaken  ? 'bg-green-50 border-green-300' :
                      isMissed ? 'bg-red-50 border-red-300' :
                      'bg-gray-50 border-gray-200'
                    }`}
                    style={{ minHeight: '60px' }}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: (dose.color || '#3B82F6') + '25' }}
                    >
                      {dose.icon || '💊'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-gray-900 truncate">{dose.medicationName}</p>
                      <p className="text-sm font-semibold text-gray-500">{dose.dosage}</p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-center" style={{ minWidth: '56px' }}>
                      {isTaken ? (
                        <><div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-400">
                          <Check className="w-5 h-5 text-green-600" strokeWidth={3} /></div>
                          <span className="text-xs font-bold text-green-700 mt-0.5">Taken</span></>
                      ) : isMissed ? (
                        <><div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center border-2 border-red-400">
                          <X className="w-5 h-5 text-red-500" strokeWidth={3} /></div>
                          <span className="text-xs font-bold text-red-600 mt-0.5">Missed</span></>
                      ) : (
                        <><div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-300">
                          <Clock className="w-5 h-5 text-gray-400" /></div>
                          <span className="text-xs font-bold text-gray-500 mt-0.5">Pending</span></>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Fixed header ── */}
      <header className="flex-none bg-white border-b-2 border-gray-200 px-4 pt-5 pb-2">
        <div className="flex items-center gap-2">
          {/* Back button — Fitts' Law 44×44 */}
          {!treatmentsWizardActive ? (
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0"
              aria-label="Back to dashboard"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
          ) : (
            <div className="flex-shrink-0" style={{ width: '44px' }} />
          )}

          {/* Centre: resident name + today date */}
          <div className="flex-1 text-center">
            {activeTab === 'today' ? (
              <>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  {format(new Date(), 'EEEE, MMMM do')}
                </p>
                <h1 className="text-xl font-extrabold text-gray-900 flex items-center justify-center gap-2">
                  <User className="w-5 h-5 text-blue-600" aria-hidden="true" />
                  {residentName || 'Loading…'}
                </h1>
              </>
            ) : (
              <h1 className="text-xl font-extrabold text-gray-900">
                {activeTab === 'treatments' ? 'Treatments'
                  : activeTab === 'history'    ? 'Dose History'
                  : ''}
              </h1>
            )}
          </div>

          {/* Spacer to balance the back button */}
          <div className="flex-shrink-0" style={{ width: '44px' }} />
        </div>

        {/* Today's progress bar — Zeigarnik Effect */}
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

      {/* ══════════ TAB CONTENT ══════════ */}

      {/* ── TODAY TAB ── */}
      {activeTab === 'today' && (
        <>
          {todayError && (
            <div className="flex-none mx-4 mt-2 p-3 bg-red-50 border-2 border-red-300 rounded-xl">
              <p className="text-base font-bold text-red-700 text-center">{todayError}</p>
            </div>
          )}

          {todayLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm font-bold text-gray-400">Loading schedule…</p>
            </div>
          ) : todayDoses.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
              <Check className="w-16 h-16 text-green-500 mx-auto mb-3" aria-hidden="true" />
              <p className="text-xl font-extrabold text-gray-800">All done for today! 🎉</p>
              <p className="text-base text-gray-500 mt-1">No medications scheduled today.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-3 pb-4 pt-3">
              <p className="text-sm font-extrabold text-gray-600 uppercase tracking-wider mb-2 px-1">
                Today's Medications
              </p>

              {/* Grouped by time — Gestalt Proximity */}
              {groupedDoses.map(([time, doses]) => {
                const allTaken    = doses.every(d => d.status === 'taken');
                const anyMissed   = doses.some(d => d.status === 'missed');
                const anyOverdue  = doses.some(d => d.status === 'pending' && isOverdue(d.scheduledTime));

                return (
                  <div key={time} className="mb-4">
                    {/* Time header — color-coded (Von Restorff) */}
                    <div className="flex items-center gap-3 px-1 mb-2">
                      <div className={`rounded-2xl px-4 py-2 flex items-center gap-2 ${
                        allTaken  ? 'bg-green-100' :
                        (anyMissed || anyOverdue) ? 'bg-red-100' :
                        'bg-blue-600'
                      }`}>
                        <span className={`text-2xl font-extrabold tracking-tight ${
                          allTaken  ? 'text-green-700' :
                          (anyMissed || anyOverdue) ? 'text-red-700' :
                          'text-white'
                        }`}>{fmtTime(time)}</span>
                      </div>
                      <div className="flex-1 h-0.5 bg-gray-200 rounded" />
                      <span className={`text-sm font-bold ${
                        allTaken ? 'text-green-600' : (anyMissed || anyOverdue) ? 'text-red-500' : 'text-gray-500'
                      }`}>
                        {allTaken ? '✓ All done' : `${doses.filter(d => d.status === 'taken').length}/${doses.length}`}
                      </span>
                    </div>

                    {/* Medication cards */}
                    <div className="space-y-2 pl-1">
                      {doses.map(dose => {
                        const isTaken   = dose.status === 'taken';
                        const isMissed  = dose.status === 'missed';
                        const isLate    = dose.status === 'pending' && isOverdue(dose.scheduledTime);

                        return (
                          <div
                            key={dose.id}
                            className={`rounded-2xl p-3 border-2 flex items-center gap-3 ${
                              isTaken  ? 'bg-green-50 border-green-400' :
                              isMissed ? 'bg-red-50 border-red-400' :
                              isLate   ? 'bg-red-100 border-red-500' :
                              'bg-white border-gray-200'
                            }`}
                          >
                            {/* Icon */}
                            <div
                              className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                              style={{ backgroundColor: (dose.color || '#3B82F6') + '25' }}
                              aria-hidden="true"
                            >
                              {dose.icon || '💊'}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-lg font-bold text-gray-900 truncate">{dose.medicationName}</p>
                              <p className="text-sm font-semibold text-gray-600">{dose.dosage}</p>
                              {isLate && (
                                <span className="text-xs font-extrabold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                                  OVERDUE
                                </span>
                              )}
                            </div>

                            {/* Status / Nurse action */}
                            <div className="flex-shrink-0">
                              {isTaken ? (
                                <div className="flex flex-col items-center">
                                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-300">
                                    <Check className="w-7 h-7 text-green-600" strokeWidth={3} />
                                  </div>
                                  <span className="text-xs font-bold text-green-700 mt-0.5">Taken</span>
                                </div>
                              ) : isNurse ? (
                                /* Nurses can mark administered directly from Today tab */
                                markSuccess === dose.id ? (
                                  <div
                                    role="status"
                                    aria-live="polite"
                                    className="flex flex-col items-center"
                                  >
                                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-300">
                                      <Check className="w-7 h-7 text-green-600" strokeWidth={3} />
                                    </div>
                                    <span className="text-xs font-bold text-green-700 mt-0.5">Done</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setAdminDoseId(dose.id)}
                                    disabled={markingDose === dose.id}
                                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold px-3 py-2 rounded-xl shadow transition-all disabled:opacity-50"
                                    style={{ minWidth: '72px', minHeight: '48px' }}
                                  >
                                    {markingDose === dose.id ? 'Saving…' : '💉 Give'}
                                  </button>
                                )
                              ) : (
                                /* Family caregiver — read-only status indicator */
                                <div className="flex flex-col items-center">
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                                    isMissed ? 'bg-red-100 border-red-300' : 'bg-gray-100 border-gray-300'
                                  }`}>
                                    {isMissed
                                      ? <X className="w-7 h-7 text-red-500" strokeWidth={3} />
                                      : <Clock className="w-6 h-6 text-gray-400" />}
                                  </div>
                                  <span className={`text-xs font-bold mt-0.5 ${isMissed ? 'text-red-600' : 'text-gray-500'}`}>
                                    {isMissed ? 'Missed' : 'Upcoming'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Nurse: inline admin note form — Input Form Best Practices */}
                    {isNurse && adminDoseId && doses.some(d => d.id === adminDoseId) && (
                      <div className="mt-2 mx-1 bg-white rounded-2xl border-2 border-blue-200 p-4 space-y-3">
                        <p className="text-base font-extrabold text-gray-900">
                          Give: {doses.find(d => d.id === adminDoseId)?.medicationName}
                        </p>
                        {/* HCI: label above, hint below */}
                        <div>
                          <label
                            htmlFor={`admin-note-${adminDoseId}`}
                            className="block text-sm font-bold text-gray-700 mb-1"
                          >
                            Administration Note
                          </label>
                          <input
                            id={`admin-note-${adminDoseId}`}
                            type="text"
                            value={adminNote}
                            onChange={e => setAdminNote(e.target.value)}
                            placeholder={`e.g. "given at ${format(new Date(), 'h:mm a')} by ${user?.firstName}"`}
                            aria-describedby={`admin-note-${adminDoseId}-hint`}
                            className="w-full border-2 border-gray-300 rounded-xl px-4 text-base text-gray-900 bg-gray-50
                              focus:border-blue-600 focus:ring-4 focus:ring-blue-100 focus:bg-white focus:outline-none transition-all"
                            style={{ minHeight: '52px' }}
                          />
                          <p id={`admin-note-${adminDoseId}-hint`} className="text-xs text-gray-400 mt-1">
                            Optional — leave blank to record without a note.
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => { setAdminDoseId(null); setAdminNote(''); }}
                            className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-base hover:bg-gray-50"
                            style={{ minHeight: '52px' }}
                          >Cancel</button>
                          <button
                            onClick={() => handleMarkAdministered(adminDoseId)}
                            disabled={markingDose === adminDoseId}
                            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base disabled:opacity-50 transition-colors"
                            style={{ minHeight: '52px' }}
                          >
                            {markingDose === adminDoseId ? 'Saving…' : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── TREATMENTS TAB ── */}
      {activeTab === 'treatments' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TreatmentsTab
            residentId={residentId}
            isCaregiver={true}
            onWizardStateChange={setTreatmentsWizardActive}
          />
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        historyLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-lg font-bold text-gray-400">Loading history…</p>
          </div>
        ) : historyError ? (
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl">
              <p className="text-lg font-bold text-red-700 text-center">{historyError}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3 space-y-3">

            {/* Month nav */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="w-12 h-12 rounded-xl bg-white border-2 border-gray-300 flex items-center justify-center active:scale-95 transition-transform shadow-sm"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-6 h-6 text-gray-700" strokeWidth={3} />
              </button>
              <h2 className="text-xl font-extrabold text-gray-900">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <button
                onClick={() => canGoNext && setCurrentMonth(addMonths(currentMonth, 1))}
                disabled={!canGoNext}
                className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-transform active:scale-95 shadow-sm ${
                  canGoNext ? 'bg-white border-gray-300' : 'bg-gray-100 border-gray-200 opacity-40'
                }`}
                aria-label="Next month"
              >
                <ChevronRight className="w-6 h-6 text-gray-700" strokeWidth={3} />
              </button>
            </div>

            {/* Calendar heatmap */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Day-of-week header */}
              <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} className="py-2.5 text-center">
                    <span className="text-sm font-bold text-gray-500">{d}</span>
                  </div>
                ))}
              </div>

              {/* Week rows */}
              <div className="px-1 py-2">
                {calendarWeeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7">
                    {week.map((day, ci) => {
                      const inMonth = isSameMonth(day, currentMonth);
                      const ds = format(day, 'yyyy-MM-dd');
                      const summary = summaryMap[ds];
                      const isSelected = selectedDay && format(selectedDay, 'yyyy-MM-dd') === ds;
                      const { bg, text, dot } = cellColor(day);
                      const future = isFuture(day) && !isToday(day);

                      return (
                        <button
                          key={ci}
                          onClick={() => {
                            if (!inMonth || future) return;
                            setSelectedDay(day);
                            if (summary) setDayPopup(summary);
                          }}
                          disabled={!inMonth || future}
                          className={`h-12 w-full flex flex-col items-center justify-center gap-1 rounded-lg
                            ${isSelected ? 'bg-blue-600' : ''}
                            ${isToday(day) && !isSelected ? 'bg-blue-50' : ''}
                            ${inMonth && !future && !isSelected ? 'active:bg-gray-100 transition-colors' : ''}
                            ${!inMonth || future ? 'opacity-20 cursor-default' : ''}
                          `}
                        >
                          <span className={`text-base font-bold leading-none ${
                            isSelected ? 'text-white' :
                            isToday(day) ? 'text-blue-600 font-extrabold' :
                            text
                          }`}>{format(day, 'd')}</span>
                          {dot && inMonth && !future && (
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : dot}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Legend — not colour-only (WCAG) */}
              <div className="flex justify-center items-center gap-6 py-2.5 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  <span className="text-xs font-semibold text-gray-500">All taken</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />
                  <span className="text-xs font-semibold text-gray-500">Partial</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                  <span className="text-xs font-semibold text-gray-500">Missed</span>
                </div>
              </div>
            </div>

            {/* Day-by-day compact list */}
            {history.map(day => (
              <div
                key={day.date}
                className="bg-white rounded-2xl border-2 border-gray-200 p-3 flex items-center justify-between cursor-pointer hover:border-blue-300 transition-colors active:scale-[0.99]"
                onClick={() => { setSelectedDay(parseISO(day.date)); setDayPopup(day); }}
                style={{ minHeight: '60px' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {day.adherenceRate === 100 ? '✅' : day.adherenceRate >= 50 ? '⚠️' : '❌'}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {format(parseISO(day.date), 'EEE, MMM do')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {day.doses.filter(d => d.status === 'taken').length}/{day.doses.length} taken
                      {day.doses.some(d => d.status === 'missed') && (
                        <span className="text-red-600 font-bold">
                          {' '}· {day.doses.filter(d => d.status === 'missed').length} missed
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <span className={`text-base font-extrabold text-right ${
                  day.adherenceRate >= 80 ? 'text-green-700' :
                  day.adherenceRate >= 50 ? 'text-yellow-700' : 'text-red-700'
                }`}>
                  {day.adherenceRate}%
                </span>
              </div>
            ))}

            {history.length === 0 && (
              <div className="mt-8 text-center">
                <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-2" aria-hidden="true" />
                <p className="text-lg font-bold text-gray-500">No history yet</p>
              </div>
            )}

            {/* Export */}
            <button
              onClick={handleExport}
              className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-md active:scale-[0.98] transition-transform"
              style={{ minHeight: '56px' }}
            >
              <Download className="w-5 h-5" aria-hidden="true" />
              Export History as CSV
            </button>
          </div>
        )
      )}

      {/* ── Bottom tab bar (Fitts' Law: 64 px, Von Restorff: active = blue) ── */}
      <nav className="flex-none bg-white border-t-2 border-gray-200 flex" role="tablist">
        {[
          { id: 'today',      label: 'Today',      sublabel: 'Live Schedule', Icon: Calendar },
          { id: 'treatments', label: 'Treatments', sublabel: 'Manage Meds',   Icon: Pill },
          { id: 'history',    label: 'History',    sublabel: 'Past Doses',    Icon: ClipboardList },
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
                ${active ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}
              `}
              style={{ minHeight: '64px' }}
            >
              <Icon className={`w-7 h-7 mb-0.5 ${active ? 'text-blue-600' : 'text-gray-400'}`} aria-hidden="true" />
              <span className={`text-sm font-extrabold leading-tight ${active ? 'text-blue-600' : 'text-gray-500'}`}>
                {label}
              </span>
              <span className={`text-xs font-semibold leading-tight ${active ? 'text-blue-400' : 'text-gray-400'}`}>
                {sublabel}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default ResidentManagePage;
