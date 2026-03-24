import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Calendar, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, isFuture, addMonths, subMonths } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ResidentDetail = () => {
  const { residentId } = useParams();
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState(30);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [adminDoseId, setAdminDoseId] = useState(null);
  const [marking, setMarking] = useState(false);
  const [markSuccess, setMarkSuccess] = useState(null); // { name } — brief confirmation

  const isNurse = user?.role === 'nurse';

  useEffect(() => { fetchHistory(); }, [residentId, daysFilter]);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/dashboard/resident/${residentId}/history?days=${daysFilter}`
      );
      setHistory(response.data);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Build a date→summary map ── */
  const summaryMap = useMemo(() => {
    const m = {};
    history.forEach(day => {
      m[day.date] = day;
    });
    return m;
  }, [history]);

  /* ── Build calendar weeks for current month ── */
  const calendarWeeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd   = endOfMonth(currentMonth);
    const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd     = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const weeks = [];
    let day = calStart;
    while (day <= calEnd) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(day));
        day = addDays(day, 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [currentMonth]);

  /* ── Today strip numbers ── */
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySummary = summaryMap[todayStr];
  const todayTaken  = todaySummary ? todaySummary.doses.filter(d => d.status === 'taken').length : 0;
  const todayTotal  = todaySummary ? todaySummary.doses.length : 0;
  const todayMissed = todaySummary ? todaySummary.doses.filter(d => d.status === 'missed').length : 0;

  /* ── Handle nurse mark-administered ── */
  const handleMarkAdministered = async (doseId) => {
    setMarking(true);
    try {
      await axios.post(`${API_URL}/medications/take-dose/${doseId}`, { notes: adminNote || undefined });
      setAdminDoseId(null);
      setAdminNote('');
      // HCI: inline success feedback (Responsive Design — immediate confirmation)
      setMarkSuccess(doseId);
      setTimeout(() => setMarkSuccess(null), 3000);
      fetchHistory();
    } catch (err) {
      console.error('Error marking dose:', err);
    } finally {
      setMarking(false);
    }
  };

  /* ── Cell color for a calendar day ── */
  const cellStyle = (date) => {
    const ds = format(date, 'yyyy-MM-dd');
    const summary = summaryMap[ds];
    if (isFuture(date) && !isToday(date)) return 'bg-gray-100 text-gray-400';
    if (!summary) return 'bg-gray-100 text-gray-500';
    const rate = summary.adherenceRate;
    if (rate === 100)   return 'bg-green-200 text-green-900';
    if (rate >= 50)     return 'bg-yellow-200 text-yellow-900';
    return               'bg-red-200 text-red-900';
  };

  const cellEmoji = (date) => {
    const ds = format(date, 'yyyy-MM-dd');
    const summary = summaryMap[ds];
    if (isFuture(date) && !isToday(date)) return '';
    if (!summary) return '';
    const rate = summary.adherenceRate;
    if (rate === 100) return '✅';
    if (rate >= 50)   return '⚠️';
    return             '❌';
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm font-bold text-gray-400">Loading history…</p>
      </div>
    );
  }

  const selectedDayData = selectedDay ? summaryMap[format(selectedDay, 'yyyy-MM-dd')] : null;

  return (
    <div className="h-full flex flex-col bg-gray-50">

      {/* ── Fixed header ── */}
      <header className="flex-none bg-white border-b-2 border-gray-200 px-4 pt-5 pb-2">
        <div className="flex items-center gap-2 mb-2">
          {/* HCI: styled back button — Fitts' Law (44×44 px), bg-gray-100, rounded-xl */}
          <Link
            to="/"
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center flex-shrink-0"
            aria-label="Back to dashboard"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </Link>
          <h1 className="text-xl font-extrabold text-gray-900">Medication History</h1>
        </div>

        {/* ── Today strip ── */}
        <div className="bg-blue-50 rounded-xl p-3 mb-2">
          <p className="text-sm font-bold text-blue-700 mb-1">Today</p>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold text-blue-900">{todayTaken}/{todayTotal} taken</span>
            {todayMissed > 0 && (
              <span className="text-sm font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                {todayMissed} missed
              </span>
            )}
          </div>
          <div className="mt-1 w-full bg-blue-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${
                todayTotal === 0 ? 'bg-gray-300' :
                todayTaken === todayTotal ? 'bg-green-500' :
                todayMissed > 0 ? 'bg-red-400' : 'bg-blue-500'
              }`}
              style={{ width: `${todayTotal > 0 ? Math.round((todayTaken / todayTotal) * 100) : 0}%` }}
            />
          </div>
        </div>

        {/* Day filter pills */}
          {/* Day filter pills — 44px Fitts' Law targets, role=tablist */}
          <div className="flex gap-1.5" role="tablist" aria-label="History range">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                role="tab"
                aria-selected={daysFilter === days}
                onClick={() => setDaysFilter(days)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                  daysFilter === days ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={{ minHeight: '44px' }}
              >
                Last {days} Days
              </button>
            ))}
          </div>
      </header>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">

        {/* ── Mini calendar ── */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-3">
          {/* Month nav */}
          {/* Month nav — 44px targets, aria-labels answer 'Where am I in time?' */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Previous month"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h3 className="text-lg font-bold text-gray-900">{format(currentMonth, 'MMMM yyyy')}</h3>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Next month"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center text-xs font-bold text-gray-500">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          {calendarWeeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
              {week.map((day, di) => {
                const inMonth = isSameMonth(day, currentMonth);
                const dayStr = format(day, 'yyyy-MM-dd');
                const isSelected = selectedDay && format(selectedDay, 'yyyy-MM-dd') === dayStr;

                return (
                  <button
                    key={di}
                    onClick={() => inMonth && summaryMap[dayStr] ? setSelectedDay(day) : null}
                    className={`h-12 w-full rounded-lg text-xs font-bold flex flex-col items-center justify-center transition-all ${
                      !inMonth ? 'opacity-20' :
                      isSelected ? 'ring-2 ring-blue-500 ring-offset-1' :
                      ''
                    } ${inMonth ? cellStyle(day) : 'bg-gray-50 text-gray-300'}`}
                  >
                    <span>{format(day, 'd')}</span>
                    {inMonth && <span className="text-[10px] leading-none">{cellEmoji(day)}</span>}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Legend */}
          {/* Legend — dots (same pattern as HistoryTab; not colour-only per WCAG) */}
          <div className="flex justify-center gap-4 mt-2 text-xs font-bold text-gray-600">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" /> All taken</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /> Some missed</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Most missed</span>
          </div>
        </div>

        {/* ── Selected day detail ── */}
        {selectedDay && selectedDayData && (
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-5 h-5 text-gray-500" />
                <p className="text-base font-bold text-gray-900">
                  {format(selectedDay, 'EEE, MMM do')}
                </p>
              </div>
              <span className={`text-base font-extrabold text-center ${
                selectedDayData.adherenceRate >= 80 ? 'text-green-700' :
                selectedDayData.adherenceRate >= 50 ? 'text-yellow-700' : 'text-red-700'
              }`}>
                {selectedDayData.adherenceRate}%
                <span className="block text-xs font-semibold opacity-75">
                  {selectedDayData.adherenceRate >= 80 ? 'Perfect' : selectedDayData.adherenceRate >= 50 ? 'Partial' : 'Missed'}
                </span>
              </span>
            </div>

            <div className="space-y-1.5">
              {selectedDayData.doses.map((dose) => (
                <div key={dose.id} className="p-2 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                        style={{ backgroundColor: (dose.color || '#3B82F6') + '25' }}
                      >
                        {dose.icon || '💊'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{dose.medicationName}</p>
                        <p className="text-sm text-gray-500">
                          {format(parseISO(dose.scheduledTime), 'h:mm a')}
                          {dose.takenAt && ` → ${format(parseISO(dose.takenAt), 'h:mm a')}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                        dose.status === 'taken'  ? 'bg-green-100 text-green-700' :
                        dose.status === 'missed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {dose.status === 'taken' ? '✅ Taken' : dose.status === 'missed' ? '❌ Missed' : '⏳ Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Nurse: Mark administered for missed/pending doses */}
                  {isNurse && dose.status !== 'taken' && (
                    <div className="mt-2 border-t border-gray-200 pt-2">
                      {adminDoseId === dose.id ? (
                        <div className="space-y-2">
                          {/* HCI Input Form: label above field, hint below — never placeholder-only */}
                          <label htmlFor={`admin-note-${dose.id}`} className="block text-xs font-bold text-gray-700">
                            Administration Note
                          </label>
                          <input
                            id={`admin-note-${dose.id}`}
                            type="text"
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            placeholder={`e.g. "given at ${format(new Date(), 'h:mm a')} by ${user?.firstName}"`}
                            aria-describedby={`admin-note-${dose.id}-hint`}
                            className="w-full border-2 border-gray-300 rounded-xl px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                            style={{ minHeight: '44px' }}
                          />
                          {/* HCI: persistent hint below field (never disappears like placeholder) */}
                          <p id={`admin-note-${dose.id}-hint`} className="text-xs text-gray-400">
                            Optional — leave blank to record without a note.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setAdminDoseId(null); setAdminNote(''); }}
                              className="flex-1 py-2 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50"
                              style={{ minHeight: '44px' }}
                            >Cancel</button>
                            <button
                              onClick={() => handleMarkAdministered(dose.id)}
                              disabled={marking}
                              className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                              style={{ minHeight: '44px' }}
                            >
                              {marking ? 'Saving…' : 'Confirm'}
                            </button>
                          </div>
                        </div>
                      ) : markSuccess === dose.id ? (
                        /* HCI: immediate success feedback — Responsive Design guideline */
                        <div
                          role="status"
                          aria-live="polite"
                          className="w-full py-2 rounded-xl bg-green-50 text-green-700 font-bold text-sm text-center border-2 border-green-200"
                          style={{ minHeight: '44px' }}
                        >
                          ✅ Marked as administered
                        </div>
                      ) : (
                        <button
                          onClick={() => setAdminDoseId(dose.id)}
                          className="w-full py-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm hover:bg-blue-100 transition-colors border-2 border-blue-200"
                          style={{ minHeight: '44px' }}
                        >
                          💉 Mark administered
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Day-by-day compact list ── */}
        {history.map((day) => (
          <div
            key={day.date}
            className="bg-white rounded-2xl border-2 border-gray-200 p-3 flex items-center justify-between cursor-pointer hover:border-blue-300 transition-colors"
            onClick={() => setSelectedDay(parseISO(day.date))}
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
                    <span className="text-red-600 font-bold"> · {day.doses.filter(d => d.status === 'missed').length} missed</span>
                  )}
                </p>
              </div>
            </div>
            <span className={`text-base font-extrabold text-right ${
              day.adherenceRate >= 80 ? 'text-green-700' :
              day.adherenceRate >= 50 ? 'text-yellow-700' : 'text-red-700'
            }`}>
              {day.adherenceRate}%
              <span className="block text-xs font-semibold opacity-75">
                {day.adherenceRate >= 80 ? 'Perfect' : day.adherenceRate >= 50 ? 'Partial' : 'Missed'}
              </span>
            </span>
          </div>
        ))}

        {history.length === 0 && (
          <div className="mt-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-lg font-bold text-gray-500">No history available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResidentDetail;
