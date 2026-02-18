import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, Clock, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CaregiverDashboard = () => {
  const { user, logout } = useAuth();
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/caregiver`);
      setResidents(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    if (status.hasAlert) {
      return <AlertCircle className="w-12 h-12 text-red-500" />;
    }
    if (status.adherenceRate === 100) {
      return <CheckCircle className="w-12 h-12 text-green-500" />;
    }
    return <Clock className="w-12 h-12 text-yellow-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-bold text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Caregiver Dashboard
          </h1>
          <p className="text-xl text-gray-600">
            Monitor your loved ones' medication adherence
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="dashboard-card bg-blue-50 border-blue-200">
          <p className="text-lg text-gray-600 mb-1">Total Loved Ones</p>
          <p className="text-4xl font-bold text-gray-900">{residents.length}</p>
        </div>
        <div className="dashboard-card bg-green-50 border-green-200">
          <p className="text-lg text-gray-600 mb-1">All Caught Up</p>
          <p className="text-4xl font-bold text-green-700">
            {residents.filter(r => !r.hasAlert).length}
          </p>
        </div>
        <div className="dashboard-card bg-red-50 border-red-200">
          <p className="text-lg text-gray-600 mb-1">Need Attention</p>
          <p className="text-4xl font-bold text-red-700">
            {residents.filter(r => r.hasAlert).length}
          </p>
        </div>
      </div>

      {/* Residents List */}
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Your Loved Ones</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {residents.map((resident) => (
          <Link
            key={resident.residentId}
            to={`/resident/${resident.residentId}`}
            className="dashboard-card hover:shadow-xl transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {resident.residentName}
                  </h3>
                  <p className="text-lg text-gray-500 capitalize">
                    {resident.relationship}
                  </p>
                </div>
              </div>
              {getStatusIcon(resident)}
            </div>

            {/* Today's Progress */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-lg font-medium text-gray-700">
                  Today's Progress
                </span>
                <span className={`text-2xl font-bold ${
                  resident.todayStatus.adherenceRate >= 80 
                    ? 'text-green-600' 
                    : resident.todayStatus.adherenceRate >= 50 
                      ? 'text-yellow-600' 
                      : 'text-red-600'
                }`}>
                  {resident.todayStatus.adherenceRate}%
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-4 mb-3">
                <div 
                  className={`h-4 rounded-full transition-all duration-500 ${
                    resident.todayStatus.adherenceRate >= 80 
                      ? 'bg-green-500' 
                      : resident.todayStatus.adherenceRate >= 50 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${resident.todayStatus.adherenceRate}%` }}
                />
              </div>

              <div className="flex justify-between text-sm text-gray-600">
                <span>{resident.todayStatus.taken} taken</span>
                <span>{resident.todayStatus.pending} pending</span>
                <span>{resident.todayStatus.missed} missed</span>
              </div>
            </div>

            {/* Alert Banner */}
            {resident.hasAlert && (
              <div className="mt-4 p-3 bg-red-100 border-l-4 border-red-500 rounded-r-lg">
                <p className="text-lg font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Attention needed
                </p>
              </div>
            )}

            <div className="mt-4 text-center">
              <span className="text-blue-600 font-semibold text-lg">
                View Details →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {residents.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
          <User className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <p className="text-2xl text-gray-500 mb-2">No residents connected</p>
          <p className="text-lg text-gray-400">
            Ask your loved one to add you as a caregiver
          </p>
        </div>
      )}
    </div>
  );
};

export default CaregiverDashboard;
