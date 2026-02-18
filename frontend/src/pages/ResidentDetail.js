import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ResidentDetail = () => {
  const { residentId } = useParams();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState(7);

  useEffect(() => {
    fetchHistory();
  }, [residentId, daysFilter]);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/dashboard/resident/${residentId}/history?days=${daysFilter}`
      );
      setHistory(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching history:', err);
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'taken':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'missed':
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Clock className="w-6 h-6 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-bold text-gray-600">Loading history...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 text-lg font-bold"
        >
          <ChevronLeft className="w-6 h-6" />
          Back to Dashboard
        </Link>
        <h1 className="text-4xl font-bold text-gray-900">Medication History</h1>
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-2">
        {[7, 14, 30].map((days) => (
          <button
            key={days}
            onClick={() => setDaysFilter(days)}
            className={`px-6 py-3 rounded-xl font-bold text-lg transition-colors ${
              daysFilter === days
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Last {days} Days
          </button>
        ))}
      </div>

      {/* History List */}
      <div className="space-y-4">
        {history.map((day) => (
          <div key={day.date} className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-gray-500" />
                <h2 className="text-2xl font-bold text-gray-900">
                  {format(parseISO(day.date), 'EEEE, MMMM do, yyyy')}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg text-gray-600">Adherence:</span>
                <span className={`text-2xl font-bold ${
                  day.adherenceRate >= 80 ? 'text-green-600' : 
                  day.adherenceRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {day.adherenceRate}%
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div 
                className={`h-4 rounded-full transition-all duration-500 ${
                  day.adherenceRate >= 80 ? 'bg-green-500' : 
                  day.adherenceRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${day.adherenceRate}%` }}
              />
            </div>

            {/* Doses */}
            <div className="space-y-2">
              {day.doses.map((dose) => (
                <div 
                  key={dose.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: dose.color + '30' }}
                    >
                      {dose.icon}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">
                        {dose.medicationName}
                      </p>
                      <p className="text-gray-600">
                        Scheduled: {format(parseISO(dose.scheduledTime), 'h:mm a')}
                      </p>
                      {dose.takenAt && (
                        <p className="text-sm text-green-600">
                          Taken at: {format(parseISO(dose.takenAt), 'h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(dose.status)}
                    <span className={`font-bold ${
                      dose.status === 'taken' ? 'text-green-600' : 
                      dose.status === 'missed' ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {dose.status.charAt(0).toUpperCase() + dose.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {history.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
          <Calendar className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <p className="text-2xl text-gray-500">No history available</p>
        </div>
      )}
    </div>
  );
};

export default ResidentDetail;
