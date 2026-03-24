import React, { useState, useEffect, useMemo } from 'react';
import { Check, X, Clock, ChevronLeft, ChevronRight, ChevronDown, Download } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/* ── helpers ── */
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

/* ════════════════════════════════
   HistoryTab — Calendar + Med Filter
   ════════════════════════════════ */
const HistoryTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* Calendar state */
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(toKey(now));
  const [dayPopup, setDayPopup] = useState(null); // summary object or null

  /* Medication filter: '' = "All medications" */
  const [filterMed, setFilterMed] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_URL}/medications/dose-history?days=60`);
        setData(res.data);
      } catch (err) {
        setError('Could not load history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  /* ── Build filtered summaryMap based on selected medication ── */
  const summaryMap = useMemo(() => {
    if (!data) return {};
    const map = {};

    data.daySummaries.forEach(day => {
      // Filter doses to just the selected medication (or all)
      const doses = filterMed
        ? day.doses.filter(d => d.medicationName === filterMed)
        : day.doses;

      if (filterMed && doses.length === 0) return;

      const total = doses.length;
      const taken = doses.filter(d => d.status === 'taken').length;
      const missed = doses.filter(d => d.status === 'missed').length;
      const pending = doses.filter(d => d.status === 'pending').length;
      const pct = total > 0 ? Math.round((taken / total) * 100) : 0;

      map[day.date] = { date: day.date, total, taken, missed, pending, pct, doses };
    });

    return map;
  }, [data, filterMed]);

  /* ── Filtered overall stats for the summary banner ── */
  const filteredStats = useMemo(() => {
    const entries = Object.values(summaryMap);
    const totalDoses = entries.reduce((s, d) => s + d.total, 0);
    const totalTaken = entries.reduce((s, d) => s + d.taken, 0);
    const totalMissed = entries.reduce((s, d) => s + d.missed, 0);

    // Streak: walk days oldest→newest
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    let currentStreak = 0, tempStreak = 0;
    const todayKey = toKey(new Date());
    sorted.forEach(day => {
      const isToday = day.date === todayKey;
      const perfect = isToday ? (day.missed === 0) : (day.pct === 100 && day.total > 0);
      if (perfect) { tempStreak++; } else { tempStreak = 0; }
    });
    currentStreak = tempStreak;

    return { totalDoses, totalTaken, totalMissed, currentStreak };
  }, [summaryMap]);

  /* Calendar grid */
  const calendarWeeks = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const todayKey = toKey(new Date());

    const weeks = [];
    let week = new Array(startDow).fill(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(viewYear, viewMonth, d);
      const key = toKey(dateObj);
      const summary = summaryMap[key];
      const isToday = key === todayKey;
      const isFuture = dateObj > new Date();
      week.push({ day: d, key, summary, isToday, isFuture });
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }
    return weeks;
  }, [viewYear, viewMonth, summaryMap]);

  /* Month navigation */
  const canGoNext = viewYear < now.getFullYear() || (viewYear === now.getFullYear() && viewMonth < now.getMonth());
  const goBack = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const goForward = () => {
    if (!canGoNext) return;
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const selectedSummary = summaryMap[selectedDate];

  /* ── Loading / Error / Empty ── */
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-lg font-bold text-gray-400">Loading history…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl">
          <p className="text-lg font-bold text-red-700 text-center">{error}</p>
        </div>
      </div>
    );
  }
  if (!data || data.totalDoses === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <span className="text-5xl mb-3">📋</span>
        <p className="text-xl font-bold text-gray-500">No history yet</p>
        <p className="text-lg font-semibold text-gray-400 mt-1">Your past medications will show here.</p>
      </div>
    );
  }

  /* ── Export to CSV ── */
  const handleExport = () => {
    if (!data) return;
    const rows = [['Date', 'Medication', 'Dosage', 'Status', 'Scheduled Time', 'Taken At']];
    data.daySummaries.forEach(day => {
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
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dose-history.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const medList   = data.medicationStats || [];
  const activeMed = medList.find(m => m.name === filterMed);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">

      {/* ── Day detail popup ── */}
      {dayPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setDayPopup(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[75vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className={`px-5 py-4 rounded-t-2xl flex-shrink-0 ${
              dayPopup.pct === 100 ? 'bg-green-50' : dayPopup.pct > 0 ? 'bg-yellow-50' : 'bg-red-50'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-extrabold text-gray-900">{friendlyDate(dayPopup.date)}</p>
                  <p className="text-base font-bold text-gray-600">
                    {dayPopup.pct === 100
                      ? `✅ All ${dayPopup.total} ${dayPopup.total === 1 ? 'dose' : 'doses'} taken`
                      : dayPopup.taken === 0
                        ? `❌ No doses taken (${dayPopup.total} scheduled)`
                        : `⚠️ ${dayPopup.taken} of ${dayPopup.total} taken (${dayPopup.pct}%)`}
                  </p>
                </div>
                <button onClick={() => setDayPopup(null)}
                  className="w-10 h-10 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center active:scale-95 transition-all"
                  aria-label="Close">
                  <X className="w-5 h-5 text-gray-600" strokeWidth={2.5} />
                </button>
              </div>
            </div>
            <div className="px-4 pt-3 pb-4 space-y-2 overflow-y-auto flex-1">
              {dayPopup.doses && dayPopup.doses.length > 0 ? dayPopup.doses.map((dose) => {
                const isTaken = dose.status === 'taken';
                const isMissed = dose.status === 'missed';
                return (
                  <div key={dose.id}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border-2 ${
                      isTaken ? 'bg-green-50 border-green-300' :
                      isMissed ? 'bg-red-50 border-red-300' :
                      'bg-gray-50 border-gray-200'
                    }`}
                    style={{ minHeight: '60px' }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: (dose.color || '#3B82F6') + '25' }}>
                      {dose.icon}
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
              }) : (
                <p className="text-base text-gray-400 text-center py-4">No doses logged for this day.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 pb-6 pt-3 space-y-3">

        {/* ── Medication dropdown ── */}
        <div>
          <label className="block text-sm font-bold text-gray-500 mb-1 uppercase tracking-wide">
            Show history for:
          </label>
          <div className="relative">
            <select
              value={filterMed}
              onChange={e => setFilterMed(e.target.value)}
              className="w-full appearance-none bg-white border-2 border-gray-300 rounded-2xl px-4 pr-12 text-lg font-bold text-gray-900 focus:outline-none focus:border-blue-500 cursor-pointer"
              style={{ height: '56px' }}
            >
              <option value="">📋  All Medications</option>
              {medList.map(med => (
                <option key={med.name} value={med.name}>
                  {med.icon || '💊'}  {med.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
              <ChevronDown className="w-6 h-6 text-gray-500" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* ── Stats banner when a specific medication is selected ── */}
        {filterMed && activeMed && (
          <div
            className="rounded-2xl border-2 p-4 flex items-center gap-3"
            style={{ borderColor: activeMed.color || '#3B82F6', backgroundColor: (activeMed.color || '#3B82F6') + '18' }}
          >
            <span className="text-4xl">{activeMed.icon || '💊'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-extrabold text-gray-900 truncate">{filterMed}</p>
              <p className="text-base font-semibold text-gray-600">
                {filteredStats.totalTaken} of {filteredStats.totalDoses} doses taken
              </p>
              <div className="flex flex-wrap gap-x-3 mt-0.5">
                {filteredStats.totalMissed > 0 && (
                  <span className="text-sm font-bold text-red-600">❌ {filteredStats.totalMissed} missed</span>
                )}
                {filteredStats.currentStreak > 0 && (
                  <span className="text-sm font-bold text-orange-600">🔥 {filteredStats.currentStreak}-day streak</span>
                )}
                {filteredStats.totalMissed === 0 && filteredStats.totalDoses > 0 && (
                  <span className="text-sm font-bold text-green-600">✅ Perfect record!</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Month navigation ── */}
        <div className="flex items-center justify-between pt-1">
          <button onClick={goBack}
            className="w-12 h-12 rounded-xl bg-white border-2 border-gray-300 flex items-center justify-center active:scale-95 transition-transform shadow-sm">
            <ChevronLeft className="w-6 h-6 text-gray-700" strokeWidth={3} />
          </button>
          <h2 className="text-xl font-extrabold text-gray-900">{monthLabel}</h2>
          <button onClick={goForward} disabled={!canGoNext}
            className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-transform active:scale-95 shadow-sm ${
              canGoNext ? 'bg-white border-gray-300' : 'bg-gray-100 border-gray-200 opacity-40'
            }`}>
            <ChevronRight className="w-6 h-6 text-gray-700" strokeWidth={3} />
          </button>
        </div>

        {/* ── Calendar ── */}
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
                {week.map((cell, ci) => {
                  if (!cell) return <div key={ci} className="h-12" />;

                  const s   = cell.summary;
                  const pct = s?.pct ?? -1;
                  const isSelected = cell.key === selectedDate;

                  let numColor = 'text-gray-500';
                  let dotColor = null;

                  if (cell.isFuture) {
                    numColor = 'text-gray-300';
                  } else if (pct === 100) {
                    numColor = 'text-gray-800';
                    dotColor = 'bg-green-500';
                  } else if (pct > 0) {
                    numColor = 'text-gray-800';
                    dotColor = 'bg-yellow-500';
                  } else if (pct === 0 && s) {
                    numColor = 'text-gray-800';
                    dotColor = 'bg-red-500';
                  }

                  return (
                    <button
                      key={ci}
                      onClick={() => {
                        if (cell.isFuture) return;
                        const s = summaryMap[cell.key];
                        setSelectedDate(cell.key);
                        if (s) setDayPopup(s);
                      }}
                      disabled={cell.isFuture}
                      className={`h-12 w-full flex flex-col items-center justify-center gap-1 rounded-lg
                        ${isSelected ? 'bg-blue-600' : ''}
                        ${cell.isToday && !isSelected ? 'bg-blue-50' : ''}
                        ${!cell.isFuture && !isSelected ? 'active:bg-gray-100 transition-colors' : ''}
                        ${cell.isFuture ? 'cursor-default' : ''}
                      `}
                    >
                      <span className={`text-base font-bold leading-none ${
                        isSelected ? 'text-white' : cell.isToday ? 'text-blue-600 font-extrabold' : numColor
                      }`}>{cell.day}</span>
                      {dotColor && !cell.isFuture && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : dotColor}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
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

        {/* ── Export ── */}
        <button
          onClick={handleExport}
          className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-md active:scale-[0.98] transition-transform"
          style={{ minHeight: '56px' }}
        >
          <Download className="w-5 h-5" />
          Export History as CSV
        </button>

      </div>
    </div>
  );
};

export default HistoryTab;
