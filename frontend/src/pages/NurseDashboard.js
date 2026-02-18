import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, Clock, User, DoorOpen, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const NurseDashboard = () => {
  const { user, logout } = useAuth();
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, high, medium, low

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/nurse`);
      setResidents(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 border-red-500';
      case 'medium':
        return 'bg-yellow-100 border-yellow-500';
      default:
        return 'bg-green-100 border-green-500';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return (
          <span className="px-3 py-1 bg-red-600 text-white text-sm font-bold rounded-full">
            HIGH PRIORITY
          </span>
        );
      case 'medium':
        return (
          <span className="px-3 py-1 bg-yellow-500 text-white text-sm font-bold rounded-full">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded-full">
            LOW
          </span>
        );
    }
  };

  const filteredResidents = residents.filter(r => 
    filter === 'all' || r.priority === filter
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-bold text-gray-600">Loading floor data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Floor Dashboard
          </h1>
          <p className="text-xl text-gray-600">
            Monitor all residents' medication status
          </p>
        </div>
        <button 
          onClick={logout}
          className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl font-bold text-gray-700 transition-colors"
        >
          <LogOut className="w-6 h-6" />
          Log Out
        </button>
      </header>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="dashboard-card bg-red-50 border-2 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg text-red-700 font-semibold">Overdue</p>
              <p className="text-4xl font-bold text-red-800">
                {residents.reduce((acc, r) => acc + r.todayStatus.overdue, 0)}
              </p>
            </div>
            <AlertCircle className="w-12 h-12 text-red-600" />
          </div>
        </div>
        <div className="dashboard-card bg-yellow-50 border-2 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg text-yellow-700 font-semibold">Missed</p>
              <p className="text-4xl font-bold text-yellow-800">
                {residents.reduce((acc, r) => acc + r.todayStatus.missed, 0)}
              </p>
            </div>
            <Clock className="w-12 h-12 text-yellow-600" />
          </div>
        </div>
        <div className="dashboard-card bg-green-50 border-2 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg text-green-700 font-semibold">On Track</p>
              <p className="text-4xl font-bold text-green-800">
                {residents.filter(r => r.priority === 'low').length}
              </p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>
        <div className="dashboard-card bg-blue-50 border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg text-blue-700 font-semibold">Total Residents</p>
              <p className="text-4xl font-bold text-blue-800">{residents.length}</p>
            </div>
            <User className="w-12 h-12 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {['all', 'high', 'medium', 'low'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-6 py-3 rounded-xl font-bold text-lg transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && (
              <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-full">
                {residents.filter(r => r.priority === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Residents Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-lg font-bold text-gray-700">Priority</th>
              <th className="px-6 py-4 text-left text-lg font-bold text-gray-700">Room</th>
              <th className="px-6 py-4 text-left text-lg font-bold text-gray-700">Resident</th>
              <th className="px-6 py-4 text-left text-lg font-bold text-gray-700">Status</th>
              <th className="px-6 py-4 text-left text-lg font-bold text-gray-700">Overdue/Missed</th>
              <th className="px-6 py-4 text-left text-lg font-bold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredResidents.map((resident) => (
              <tr 
                key={resident.residentId}
                className={`border-b-2 border-l-8 ${getPriorityColor(resident.priority)}`}
              >
                <td className="px-6 py-4">
                  {getPriorityBadge(resident.priority)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <DoorOpen className="w-5 h-5 text-gray-500" />
                    <span className="text-xl font-bold text-gray-900">
                      {resident.room || 'N/A'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xl font-bold text-gray-900">
                    {resident.residentName}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${
                          resident.todayStatus.taken / resident.todayStatus.total >= 0.8
                            ? 'bg-green-500'
                            : resident.todayStatus.taken / resident.todayStatus.total >= 0.5
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                        style={{ 
                          width: `${resident.todayStatus.total > 0 
                            ? (resident.todayStatus.taken / resident.todayStatus.total) * 100 
                            : 0}%` 
                        }}
                      />
                    </div>
                    <span className="text-lg font-bold text-gray-700">
                      {resident.todayStatus.taken}/{resident.todayStatus.total}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {resident.overdueDoses.length > 0 ? (
                    <div className="space-y-1">
                      {resident.overdueDoses.slice(0, 2).map((dose, idx) => (
                        <div key={idx} className="text-red-700 font-bold">
                          {dose.medicationName} ({dose.minutesOverdue}m overdue)
                        </div>
                      ))}
                      {resident.overdueDoses.length > 2 && (
                        <div className="text-red-600">
                          +{resident.overdueDoses.length - 2} more
                        </div>
                      )}
                    </div>
                  ) : resident.missedDoses.length > 0 ? (
                    <span className="text-yellow-700 font-bold">
                      {resident.missedDoses.length} missed
                    </span>
                  ) : (
                    <span className="text-green-600 font-bold">None</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Link
                    to={`/resident/${resident.residentId}`}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredResidents.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
            <p className="text-2xl text-gray-500">No residents in this category</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NurseDashboard;
