import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ResidentDashboard from './pages/ResidentDashboard';
import CaregiverDashboard from './pages/CaregiverDashboard';
import NurseDashboard from './pages/NurseDashboard';
import ResidentDetail from './pages/ResidentDetail';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-bold text-gray-600">Loading...</div>
      </div>
    );
  }

  // Public routes (only accessible when not logged in)
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Role-based routing
  const getDashboard = () => {
    switch (user.role) {
      case 'resident':
        return <ResidentDashboard />;
      case 'caregiver':
        return <CaregiverDashboard />;
      case 'nurse':
        return <NurseDashboard />;
      default:
        return <ResidentDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={getDashboard()} />
        <Route path="/resident/:residentId" element={<ResidentDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
