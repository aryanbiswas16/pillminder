import React, { useState, useEffect } from 'react';
import { Check, Clock, AlertCircle, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ResidentDashboard = () => {
  const { user, logout } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [takingDose, setTakingDose] = useState(null);

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

  const handleTakeDose = async (doseId) => {
    if (!doseId) return;
    
    setTakingDose(doseId);
    try {
      await axios.post(`${API_URL}/medications/take-dose/${doseId}`);
      // Update local state immediately for instant feedback
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'taken':
        return <Check className="w-16 h-16 text-green-600" strokeWidth={3} />;
      case 'missed':
        return <AlertCircle className="w-16 h-16 text-red-600" strokeWidth={3} />;
      default:
        return <Clock className="w-16 h-16 text-gray-400" strokeWidth={3} />;
    }
  };

  const getCardClass = (status) => {
    switch (status) {
      case 'taken':
        return 'med-card med-card-taken';
      case 'missed':
        return 'med-card med-card-missed';
      default:
        return 'med-card med-card-pending cursor-pointer';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-3xl font-bold text-gray-600">Loading your medications...</div>
      </div>
    );
  }

  const takenCount = schedule.filter(s => s.status === 'taken').length;
  const totalCount = schedule.length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Hello, {user?.firstName}
          </h1>
          <p className="text-2xl text-gray-600">
            {format(new Date(), 'EEEE, MMMM do')}
          </p>
        </div>
        <button 
          onClick={logout}
          className="p-4 rounded-xl bg-gray-200 hover:bg-gray-300 transition-colors"
          aria-label="Log out"
        >
          <LogOut className="w-8 h-8 text-gray-700" />
        </button>
      </header>

      {/* Overall Status - Big and Clear */}
      <div className="mb-8 p-6 rounded-2xl bg-white shadow-lg border-4 border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl text-gray-600 mb-1">Today's Progress</p>
            <p className="text-5xl font-bold text-gray-900">
              {takenCount} <span className="text-3xl text-gray-500">of</span> {totalCount}
            </p>
            <p className="text-xl text-gray-500 mt-1">medications taken</p>
          </div>
          <div className="w-32 h-32 rounded-full bg-green-100 flex items-center justify-center border-4 border-green-500">
            <span className="text-5xl font-bold text-green-700">
              {totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-6 bg-red-100 border-l-8 border-red-600 rounded-xl">
          <p className="text-2xl font-bold text-red-800">{error}</p>
        </div>
      )}

      {/* Medication Cards */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Your Medications</h2>
        
        {schedule.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl shadow-lg">
            <p className="text-2xl text-gray-500">No medications scheduled for today</p>
          </div>
        ) : (
          schedule.map((med) => (
            <div
              key={med.doseId || med.scheduleId}
              className={getCardClass(med.status)}
              onClick={() => med.status === 'pending' && handleTakeDose(med.doseId)}
              role="button"
              tabIndex={med.status === 'pending' ? 0 : -1}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && med.status === 'pending') {
                  handleTakeDose(med.doseId);
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  {/* Icon */}
                  <div 
                    className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl"
                    style={{ backgroundColor: med.color + '30' }}
                  >
                    {med.icon}
                  </div>
                  
                  {/* Medication Info */}
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-1">
                      {med.medicationName}
                    </h3>
                    <p className="text-2xl text-gray-600">
                      {med.dosageAmount} {med.dosage}
                    </p>
                    <p className="text-xl text-gray-500 mt-1">
                      Scheduled: {med.timeOfDay}
                    </p>
                    {med.instructions && (
                      <p className="text-lg text-blue-600 mt-1">
                        {med.instructions}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status Section */}
                <div className="flex flex-col items-center gap-3">
                  {getStatusIcon(med.status)}
                  
                  {med.status === 'taken' ? (
                    <span className="text-2xl font-bold text-green-700">
                      Taken!
                    </span>
                  ) : med.status === 'missed' ? (
                    <span className="text-2xl font-bold text-red-700">
                      Missed
                    </span>
                  ) : (
                    <button
                      className="btn-primary"
                      disabled={takingDose === med.doseId}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTakeDose(med.doseId);
                      }}
                    >
                      {takingDose === med.doseId ? 'Logging...' : 'Take Now'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Help Text */}
      <div className="mt-8 p-6 bg-blue-50 rounded-2xl border-2 border-blue-200">
        <p className="text-xl text-blue-800 text-center">
          <strong>Need help?</strong> Ask your caregiver or nurse for assistance.
        </p>
      </div>
    </div>
  );
};

export default ResidentDashboard;
