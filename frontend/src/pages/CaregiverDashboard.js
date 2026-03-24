import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Calendar, Pill, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SettingsTab from './SettingsTab';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CaregiverDashboard = () => {
  const { user } = useAuth();
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');  // 'today' | 'settings'

  const isNurse = user?.role === 'nurse';
  const dashboardLabel = isNurse ? 'Nurse Dashboard' : 'Family Dashboard';
  const sectionLabel   = isNurse ? 'Your Residents'  : 'Your Loved Ones';

  useEffect(() => {
    fetchDashboard();
    // HCI: Auto-refresh every 60 s — keeps resident status current (WatchOS Actionable)
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/caregiver`);
      setResidents(response.data);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm font-bold text-gray-400">Loading…</p>
      </div>
    );
  }

  const onTrack  = residents.filter(r => !r.hasAlert).length;
  const needAttn = residents.filter(r =>  r.hasAlert).length;

  /* ── Status emoji for a resident ── */
  const statusEmoji = (resident) => {
    const rate  = resident.todayStatus?.adherenceRate || 0;
    const total = resident.todayStatus?.total || 0;
    if (total === 0) return <span className="text-xl">—</span>;
    if (rate === 100) return <span className="text-xl" title="All done">✅</span>;
    if (resident.hasAlert) return <span className="text-xl" title="Needs attention">🔴</span>;
    return <span className="text-xl" title="In progress">⚠️</span>;
  };

  /* ── Sub-label under resident name (role-aware) ── */
  const subLabel = (r) => {
    if (isNurse) return `Resident · Room ${r.room || 'N/A'}`;
    return r.relationship ? r.relationship.charAt(0).toUpperCase() + r.relationship.slice(1) : '';
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">

      {/* ── Fixed header ── */}
      <header className="flex-none bg-white border-b-2 border-gray-200 px-4 pt-5 pb-2">
        <div className="mb-2">
          <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{dashboardLabel}</p>
          <h1 className="text-2xl font-extrabold text-gray-900">Hello, {user?.firstName} 👋</h1>
          <p className="text-sm text-gray-500 font-medium">{format(new Date(), 'EEEE, MMMM do')}</p>
        </div>

        {activeTab === 'today' && (
          isNurse ? (
            /* Nurse: Attention tile dominates, then On Track + Total below */
            <div className="space-y-2">
              <div className={`rounded-xl p-3 text-center border-2 ${
                needAttn > 0 ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'
              }`}>
                <p className={`text-4xl font-extrabold ${
                  needAttn > 0 ? 'text-red-800' : 'text-green-800'
                }`}>{needAttn}</p>
                <p className={`text-sm font-bold uppercase tracking-wide ${
                  needAttn > 0 ? 'text-red-700' : 'text-green-700'
                }`}>{needAttn > 0 ? '⚠ Need Attention' : '✓ All On Track'}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green-50 rounded-xl p-2.5 text-center">
                  <p className="text-2xl font-extrabold text-green-800">{onTrack}</p>
                  <p className="text-sm font-bold text-green-700">On Track</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-2.5 text-center">
                  <p className="text-2xl font-extrabold text-blue-800">{residents.length}</p>
                  <p className="text-sm font-bold text-blue-700">Total</p>
                </div>
              </div>
            </div>
          ) : (
            /* Caregiver: original 3-column layout */
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total',     val: residents.length, color: 'blue'  },
                { label: 'On Track',  val: onTrack,           color: 'green' },
                { label: 'Attention', val: needAttn,          color: 'red'   },
              ].map(({ label, val, color }) => (
                <div key={label} className={`bg-${color}-50 rounded-xl p-2.5 text-center`}>
                  <p className={`text-2xl font-extrabold text-${color}-800`}>{val}</p>
                  <p className={`text-sm font-bold text-${color}-700`}>{label}</p>
                </div>
              ))}
            </div>
          )
        )}
      </header>

      {/* ── Tab content ── */}
      {activeTab === 'today' && (
        <>
          <div className="flex-none px-4 pt-2 pb-1">
            <p className="text-sm font-extrabold text-gray-600 uppercase tracking-wider">{sectionLabel}</p>
          </div>

          <div className={`flex-1 overflow-y-auto px-3 pb-4 ${isNurse ? 'space-y-1' : 'space-y-1.5'}`}>
            {(isNurse
              ? [...residents].sort((a, b) => (b.hasAlert ? 1 : 0) - (a.hasAlert ? 1 : 0))
              : residents
            ).map((resident) => {
              const rate  = resident.todayStatus?.adherenceRate || 0;
              const taken = resident.todayStatus?.taken || 0;
              const total = resident.todayStatus?.total || 0;
              const hasOverdue = (resident.overdueDoses?.length || 0) > 0;
              const hasMissed  = (resident.missedDoses?.length  || 0) > 0;

              return isNurse ? (
                /* ── Compact nurse card — 4–6 fit on screen ── */
                <div
                  key={resident.residentId}
                  className={`bg-white rounded-xl border-2 p-2.5 transition-all ${
                    resident.hasAlert ? 'border-red-300' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      resident.hasAlert ? 'bg-red-100' : 'bg-green-100'
                    }`}>
                      <User className={`w-5 h-5 ${resident.hasAlert ? 'text-red-600' : 'text-green-700'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1">
                        <p className="text-base font-bold text-gray-900 truncate">{resident.residentName}</p>
                        <span className="text-xs font-semibold text-gray-500 flex-shrink-0">Rm {resident.room || '—'}</span>
                      </div>
                      {resident.hasAlert ? (
                        <p className="text-xs font-bold text-red-600 truncate mt-0.5">
                          🔴{' '}
                          {hasOverdue
                            ? `${resident.overdueDoses[0].medicationName} overdue ${resident.overdueDoses[0].minutesOverdue} min`
                            : hasMissed
                              ? `Missed ${format(new Date(resident.missedDoses[0].scheduledTime), 'h:mm a')} dose`
                              : 'Needs attention'}
                        </p>
                      ) : (
                        <p className="text-xs font-bold text-green-700 mt-0.5">{taken}/{total} doses · On track ✓</p>
                      )}
                    </div>
                    <Link
                      to={`/manage/${resident.residentId}`}
                      className={`flex-shrink-0 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors ${
                        resident.hasAlert ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      style={{ minHeight: '40px', display: 'flex', alignItems: 'center' }}
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ) : (
                /* ── Caregiver card (original tall layout) ── */
                <div
                  key={resident.residentId}
                  className="bg-white rounded-2xl border-2 border-gray-200 p-3 transition-all"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-blue-700" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">{resident.residentName}</p>
                        <p className="text-sm font-medium text-gray-500">{subLabel(resident)}</p>
                      </div>
                    </div>
                    {statusEmoji(resident)}
                  </div>

                  {/* Progress bar — traffic-light colors */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-400'
                        }`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <span className={`text-base font-bold w-12 text-right ${
                      rate >= 80 ? 'text-green-700' : rate >= 50 ? 'text-yellow-700' : 'text-red-700'
                    }`}>
                      {taken}/{total}
                    </span>
                  </div>

                  {/* Alert — missed / overdue */}
                  {resident.hasAlert && (
                    <p className="mb-2 text-sm font-bold text-red-600 flex items-center gap-1">
                      🔔{' '}
                      {hasOverdue
                        ? `${resident.overdueDoses[0].medicationName} overdue ${resident.overdueDoses[0].minutesOverdue} min`
                        : hasMissed
                          ? `Missed ${format(new Date(resident.missedDoses[0].scheduledTime), 'h:mm a')} dose`
                          : 'Needs attention'}
                    </p>
                  )}

                  {/* Action row */}
                  <div className="flex gap-2">
                    <Link
                      to={`/manage/${resident.residentId}`}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 rounded-xl transition-colors"
                      style={{ minHeight: '44px' }}
                    >
                      <Pill className="w-4 h-4" />
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}

            {residents.length === 0 && (
              <div className="mt-8 text-center">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-lg font-bold text-gray-500">No residents connected yet</p>
                <p className="text-sm font-medium text-gray-500 mt-1">
                  {isNurse ? 'No residents assigned to you' : 'Ask your loved one to add you as a caregiver'}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'settings' && <SettingsTab />}

      {/* ── Bottom tab bar (Fitts' Law: 64 px; Von Restorff: active = blue) ── */}
      <nav className="flex-none bg-white border-t-2 border-gray-200 flex" role="tablist">
        {[
          { id: 'today',    label: 'Today',    sublabel: 'My Residents',  Icon: Calendar },
          { id: 'settings', label: 'Settings', sublabel: 'Profile & More', Icon: Settings },
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

export default CaregiverDashboard;
