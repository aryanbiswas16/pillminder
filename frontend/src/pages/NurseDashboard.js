import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, Clock, User, LogOut, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const NurseDashboard = () => {
  const { user, logout } = useAuth();
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    fetchDashboard();
    // HCI: Auto-refresh every 60 s — floor data stays current (WatchOS Actionable)
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/nurse`);
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
        <p className="text-sm font-bold text-gray-400">Loading floor data…</p>
      </div>
    );
  }

  const FILTERS = ['all', 'high', 'medium', 'low'];
  const filtered = residents.filter(r => filter === 'all' || r.priority === filter);
  const overdue  = residents.reduce((a, r) => a + (r.todayStatus?.overdue || 0), 0);
  const missed   = residents.reduce((a, r) => a + (r.todayStatus?.missed  || 0), 0);
  const onTrack  = residents.filter(r => r.priority === 'low').length;

  const priorityLeft = (p) =>
    p === 'high' ? 'border-l-red-500' : p === 'medium' ? 'border-l-yellow-400' : 'border-l-green-500';

  const priorityBadge = (p) =>
    p === 'high'
      ? 'bg-red-100 text-red-700'
      : p === 'medium'
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-green-100 text-green-700';

  return (
    <div className="h-full flex flex-col bg-gray-50">

      {/* ── Logout confirmation modal (Engineer for Errors) ── */}
      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <p className="text-2xl text-center mb-2">🚪</p>
            <p className="text-xl font-extrabold text-gray-900 text-center mb-2">Sign Out?</p>
            <p className="text-base font-semibold text-gray-600 text-center mb-6">
              You will need to sign back in to view the floor dashboard.
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

      {/* ── Fixed header ── */}
      <header className="flex-none bg-white border-b-2 border-gray-200 px-4 pt-5 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Nurse View</p>
            <h1 className="text-2xl font-extrabold text-gray-900">Floor Dashboard</h1>
          </div>
          {/* Engineer for Errors: logout confirmation prevents accidental sign-out */}
          <button
            onClick={() => setConfirmLogout(true)}
            className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Log out"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <LogOut className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {[
            { label: 'Overdue',   val: overdue,            color: 'red'   },
            { label: 'Missed',    val: missed,             color: 'yellow'},
            { label: 'On Track',  val: onTrack,            color: 'green' },
            { label: 'Residents', val: residents.length,   color: 'blue'  },
          ].map(({ label, val, color }) => (
            <div key={label} className={`bg-${color}-50 rounded-xl p-2 text-center`}>
              <p className={`text-xl font-extrabold text-${color}-800`}>{val}</p>
              <p className={`text-sm font-bold text-${color}-700 leading-tight`}>{label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        {/* Filter tabs — accessible role=tablist, aria-selected, 44px targets */}
        <div className="flex gap-1.5" role="tablist" aria-label="Filter residents by priority">
          {FILTERS.map(f => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={{ minHeight: '44px' }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && (
                <span className="ml-0.5 opacity-60">
                  ({residents.filter(r => r.priority === f).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ── Scrollable resident cards ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {filtered.map((resident) => {
          const taken = resident.todayStatus?.taken || 0;
          const total = resident.todayStatus?.total || 0;
          const pct   = total > 0 ? Math.round((taken / total) * 100) : 0;
          return (
            <div
              key={resident.residentId}
              className={`bg-white rounded-2xl border-2 border-gray-200 border-l-4 ${priorityLeft(resident.priority)} p-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-base font-bold text-gray-900">{resident.residentName}</p>
                      <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${priorityBadge(resident.priority)}`}>
                        {resident.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      Room {resident.room || 'N/A'} · {taken}/{total} taken
                    </p>
                  </div>
                </div>
                <Link
                  to={`/resident/${resident.residentId}`}
                  className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors flex items-center justify-center"
                  style={{ minWidth: '60px', minHeight: '44px' }}
                  aria-label={`View ${resident.residentName}`}
                >
                  View
                </Link>
              </div>

              {/* Progress bar */}
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {resident.overdueDoses?.length > 0 && (
                  <span className="text-sm font-bold text-red-600 truncate max-w-[140px]">
                    {resident.overdueDoses[0].medicationName} overdue
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="mt-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-gray-500">No residents in this category</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NurseDashboard;